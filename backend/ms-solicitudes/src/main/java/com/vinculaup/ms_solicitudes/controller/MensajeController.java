package com.vinculaup.ms_solicitudes.controller;

import com.vinculaup.ms_solicitudes.dto.EnviarMensajeRequest;
import com.vinculaup.ms_solicitudes.dto.MensajeResponse;
import com.vinculaup.ms_solicitudes.service.MensajeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/solicitudes/{solicitudId}/mensajes")
public class MensajeController {

    private final MensajeService service;

    public MensajeController(MensajeService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MensajeResponse enviar(@PathVariable UUID solicitudId, @Valid @RequestBody EnviarMensajeRequest request) {
        return service.enviar(solicitudId, request);
    }

    @GetMapping
    public List<MensajeResponse> listar(@PathVariable UUID solicitudId,
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId) {
        return service.listar(solicitudId, usuarioId, keycloakId);
    }
}
