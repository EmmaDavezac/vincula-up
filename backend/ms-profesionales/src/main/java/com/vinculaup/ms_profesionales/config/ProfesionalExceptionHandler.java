package com.vinculaup.ms_profesionales.config;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.vinculaup.ms_profesionales.controller")
public class ProfesionalExceptionHandler {

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
        }
        return badRequest(msg);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String first = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Faltan campos requeridos en la solicitud.");
        return badRequest(first);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return badRequest("Falta el parámetro requerido '" + ex.getParameterName() + "'.");
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleHandlerValidation(HandlerMethodValidationException ex) {
        return badRequest("Error de validación en los parámetros de la solicitud.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() == null ? "Argumento no válido." : ex.getMessage();
        if (msg.toLowerCase().contains("invalid uuid")) {
            msg = "Identificador UUID no válido en la solicitud.";
        }
        return badRequest(msg);
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(
            org.springframework.web.server.ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String reason = ex.getReason() == null || ex.getReason().isBlank()
                ? "Error en la solicitud." : ex.getReason();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        org.springframework.http.HttpStatus resolved = org.springframework.http.HttpStatus.resolve(status);
        body.put("error", resolved == null ? "Error" : resolved.getReasonPhrase());
        body.put("message", reason);
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        Logger log = LoggerFactory.getLogger(ProfesionalExceptionHandler.class);
        log.warn("Violación de integridad en ms-profesionales: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", "Conflict");
        body.put("message", "Conflicto de datos: el registro ya existe o viola una restricción única.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        Logger log = LoggerFactory.getLogger(ProfesionalExceptionHandler.class);
        log.error("Error no controlado en ms-profesionales: {}: {}", ex.getClass().getName(), ex.getMessage(), ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "Internal Server Error");
        String detail = ex.getMessage();
        body.put("message", detail == null || detail.isBlank()
                ? "Error interno inesperado en ms-profesionales."
                : detail);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
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
