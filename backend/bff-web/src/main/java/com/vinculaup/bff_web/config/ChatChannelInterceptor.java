package com.vinculaup.bff_web.config;

import com.vinculaup.bff_web.service.BackendGateway;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
public class ChatChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ChatChannelInterceptor.class);
    private static final Pattern DESTINATION = Pattern.compile("^/topic/solicitudes/([0-9a-fA-F-]{36})$");

    private final JwtDecoder jwtDecoder;
    private final org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter authenticationConverter;
    private final BackendGateway gateway;
    private final WebSocketAuthorizationContext authorizationContext;

    public ChatChannelInterceptor(JwtDecoder jwtDecoder,
            org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter authenticationConverter,
            BackendGateway gateway, WebSocketAuthorizationContext authorizationContext) {
        this.jwtDecoder = jwtDecoder;
        this.authenticationConverter = authenticationConverter;
        this.gateway = gateway;
        this.authorizationContext = authorizationContext;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            throw new MessageDeliveryException(message, "No se pudieron leer los headers STOMP");
        }
        StompCommand command = accessor.getCommand();
        try {
            if (command == StompCommand.CONNECT) {
                authenticate(accessor);
                log.info("Sesión STOMP autenticada");
            } else if (command == StompCommand.SUBSCRIBE) {
                authorizeSubscription(accessor);
            } else if (command == StompCommand.SEND) {
                throw new MessageDeliveryException(message, "El chat solo admite envíos por la API autenticada");
            }
        } catch (RuntimeException exception) {
            log.warn("STOMP {} rechazado ({})", command, exception.getClass().getSimpleName());
            throw exception;
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new MessageDeliveryException("Se requiere un token Bearer para conectar al chat");
        }
        String token = header.substring(7).trim();
        Jwt jwt = jwtDecoder.decode(token);
        var authentication = authenticationConverter.convert(jwt);
        String role = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value.equals("ROLE_CLIENTE") || value.equals("ROLE_PROFESIONAL"))
                .map(value -> value.substring("ROLE_".length()))
                .findFirst()
                .orElseThrow(() -> new MessageDeliveryException("El rol no puede acceder al chat"));
        UUID subject = UUID.fromString(jwt.getSubject());
        String authorization = "Bearer " + token;
        JsonNode user = authorizationContext.withAuthorization(authorization,
                () -> gateway.buscarUsuarioPorKeycloakId(subject, jwt.getClaimAsString("email"),
                        jwt.getClaimAsString("given_name"), jwt.getClaimAsString("family_name"), role));
        if (user == null || "SUSPENDIDO".equalsIgnoreCase(user.path("estado").asText())) {
            throw new MessageDeliveryException("La cuenta no puede acceder al chat");
        }
        UUID userId = UUID.fromString(user.path("id").asText());
        ChatPrincipal principal = new ChatPrincipal(userId, subject, role, authorization);
        accessor.setUser(new UsernamePasswordAuthenticationToken(principal, null, authentication.getAuthorities()));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof UsernamePasswordAuthenticationToken authentication)
                || !(authentication.getPrincipal() instanceof ChatPrincipal principal)) {
            throw new MessageDeliveryException("La conexión del chat no está autenticada");
        }
        String destination = accessor.getDestination();
        Matcher matcher = destination == null ? null : DESTINATION.matcher(destination);
        if (matcher == null || !matcher.matches()) {
            throw new MessageDeliveryException("Destino de chat inválido");
        }
        UUID requestId = UUID.fromString(matcher.group(1));
        authorizationContext.withAuthorization(principal.authorization(), () ->
                gateway.listarMensajes(requestId, principal.usuarioId(), principal.keycloakId()));
        log.info("Suscripción de chat autorizada");
    }
}