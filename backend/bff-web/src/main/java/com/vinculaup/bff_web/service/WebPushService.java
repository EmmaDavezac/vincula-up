package com.vinculaup.bff_web.service;

import tools.jackson.databind.ObjectMapper;
import java.util.UUID;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Envío best-effort de notificaciones Web Push usando VAPID. */
@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    static {
        if (java.security.Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            java.security.Security.addProvider(new BouncyCastleProvider());
        }
    }

    private final BackendGateway gateway;
    private final ObjectMapper objectMapper;
    private final String publicKey;
    private final String privateKey;
    private final String subject;

    public WebPushService(
            BackendGateway gateway,
            ObjectMapper objectMapper,
            @Value("${push.vapid.public-key:}") String publicKey,
            @Value("${push.vapid.private-key:}") String privateKey,
            @Value("${push.vapid.subject:mailto:vinculaup@gmail.com}") String subject) {
        this.gateway = gateway;
        this.objectMapper = objectMapper;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.subject = subject;
    }

    public boolean configurado() {
        return publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }

    public String clavePublica() {
        return configurado() ? publicKey : "";
    }

    public void guardar(UUID usuarioId, tools.jackson.databind.JsonNode subscription) {
        gateway.guardarSuscripcionPush(usuarioId, subscription);
    }

    public void eliminar(UUID usuarioId, String endpoint) {
        gateway.eliminarSuscripcionPush(usuarioId, endpoint);
    }

    public void enviar(UUID usuarioId, String title, String body, String url) {
        if (!configurado()) {
            log.debug("Web Push omitido para {}: faltan claves VAPID", usuarioId);
            return;
        }
        var subscriptions = gateway.listarSuscripcionesPush(usuarioId);
        if (subscriptions == null || !subscriptions.isArray()) return;

        for (var item : subscriptions) {
            String endpoint = item.path("endpoint").asText("");
            try {
                Subscription subscription = new Subscription(
                        endpoint,
                        new Subscription.Keys(item.path("p256dh").asText(), item.path("auth").asText()));
                String payload = objectMapper.writeValueAsString(new PushPayload(title, body, url));
                PushService sender = new PushService(publicKey, privateKey, subject);
                HttpResponse response = sender.send(new Notification(subscription, payload));
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    gateway.eliminarSuscripcionPush(usuarioId, endpoint);
                } else if (status < 200 || status >= 300) {
                    log.warn("Push endpoint respondió HTTP {} para usuario {}", status, usuarioId);
                }
            } catch (Exception exception) {
                log.warn("No se pudo enviar Web Push a usuario {}: {}", usuarioId, exception.getMessage());
            }
        }
    }

    private record PushPayload(String title, String body, String url) {
    }
}
