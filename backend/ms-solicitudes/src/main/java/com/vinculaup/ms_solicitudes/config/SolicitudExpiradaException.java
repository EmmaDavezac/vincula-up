package com.vinculaup.ms_solicitudes.config;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SolicitudExpiradaException extends RuntimeException {
    public SolicitudExpiradaException(String message) {
        super(message);
    }
}