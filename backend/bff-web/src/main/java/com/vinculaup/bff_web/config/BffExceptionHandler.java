package com.vinculaup.bff_web.config;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(basePackages = "com.vinculaup.bff_web.controller")
public class BffExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(BffExceptionHandler.class);

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String name = ex.getName();
        String msg;
        if (ex.getRequiredType() != null && ex.getRequiredType().equals(java.util.UUID.class)) {
            msg = "El parámetro '" + name + "' no es un identificador UUID válido.";
        } else {
            msg = "El parámetro '" + name + "' tiene un valor no válido.";
        }
        return badRequest(msg);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        String msg = "El cuerpo de la solicitud no se pudo interpretar.";
        String lower = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
        if (lower.contains("invalid uuid string")) {
            msg = "Uno de los identificadores enviados no es un UUID válido.";
        } else if (lower.contains("cannot deserialize") && lower.contains("localdatetime")) {
            msg = "La fecha y hora propuestas tienen un formato inválido.";
        }
        return badRequest(msg);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return badRequest("Falta el parámetro requerido '" + ex.getParameterName() + "'.");
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleHandlerValidation(HandlerMethodValidationException ex) {
        return badRequest("Error de validación en los parámetros de la solicitud.");
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleBeanValidation(
            org.springframework.web.bind.MethodArgumentNotValidException ex) {
        String first = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Faltan campos requeridos en la solicitud.");
        return badRequest(first);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() == null ? "Argumento no válido." : ex.getMessage();
        if (msg.toLowerCase().contains("invalid uuid")) {
            msg = "Identificador UUID no válido en la solicitud.";
        }
        return badRequest(msg);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String reason = ex.getReason() == null ? "" : ex.getReason();
        if (reason.isBlank()) {
            reason = switch (status) {
                case 400 -> "Solicitud no válida.";
                case 401 -> "No autorizado.";
                case 403 -> "Acceso denegado.";
                case 404 -> "Recurso no encontrado.";
                case 409 -> "Conflicto en el estado actual.";
                case 502 -> "No se pudo contactar un servicio interno.";
                default -> "Error en el servidor.";
            };
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", reasonPhrase(status));
        body.put("message", reason);
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Error no controlado en BFF: {}: {}", ex.getClass().getName(), ex.getMessage(), ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "Internal Server Error");
        String detail = ex.getMessage();
        body.put("message", detail == null || detail.isBlank()
                ? "Error interno inesperado. Revisá los logs del BFF (docker compose logs bff-web)."
                : detail);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private String reasonPhrase(int status) {
        HttpStatus resolved = HttpStatus.resolve(status);
        return resolved == null ? "Error" : resolved.getReasonPhrase();
    }

    private ResponseEntity<Map<String, Object>> badRequest(String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Bad Request");
        body.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
