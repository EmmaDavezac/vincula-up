package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.client.DisponibilidadProfesional;
import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.SolicitudResponse;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.RolCancelacion;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SolicitudService {

    private static final List<EstadoSolicitud> ESTADOS_ACTIVOS = List.of(
            EstadoSolicitud.PENDIENTE, EstadoSolicitud.ACEPTADA);

    private final SolicitudRepository repository;
    private final ProfesionalesClient profesionalesClient;
    private final GeocodingClient geocodingClient;

    public SolicitudService(SolicitudRepository repository, ProfesionalesClient profesionalesClient,
            GeocodingClient geocodingClient) {
        this.repository = repository;
        this.profesionalesClient = profesionalesClient;
        this.geocodingClient = geocodingClient;
    }

    public SolicitudResponse crear(CrearSolicitudRequest request) {
        // El frontend puede enviar el id del perfil del padrón o el usuarioId de ms-usuarios:
        // se resuelve el perfil y se persiste siempre su id canónico para que la validación de
        // disponibilidad y el listado de solicitudes funcionen con una única identidad.
        ProfesionalIdentidad profesional = profesionalesClient.obtenerPorIdentidad(request.profesionalId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "El profesional seleccionado no existe"));
        if (!"ACTIVO".equalsIgnoreCase(profesional.estado())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El profesional debe tener su perfil activado para recibir solicitudes");
        }
        if (repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(
                request.clienteId(), request.especialidadId(), ESTADOS_ACTIVOS)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya tenes una solicitud activa para esta especialidad");
        }
        if (!estaDentroDeDisponibilidad(profesional.id(), request.fechaHoraPropuesta())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El horario propuesto esta fuera de la disponibilidad del profesional");
        }

        // Ubicación estilo MercadoLibre: si el cliente no adjunta coordenadas,
        // el backend transforma la dirección textual con el proveedor GPS
        // (Nominatim, el mismo del endpoint /api/gps) y las persiste en la solicitud.
        LocalizacionUbicacion ubicacion = resolverUbicacion(
                request.direccionServicio(), request.latitud(), request.longitud());

        // El turno es un rango: la disponibilidad se valida contra el inicio y el fin
        // se muestra en la tarjeta, así que no puede ser anterior al inicio.
        if (request.fechaHoraFinPropuesta() != null
                && !request.fechaHoraFinPropuesta().isAfter(request.fechaHoraPropuesta())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El fin del turno tiene que ser posterior al inicio");
        }

        Solicitud solicitud = repository.save(new Solicitud(
                request.clienteId(), profesional.id(), request.especialidadId(),
                ubicacion.direccion(), ubicacion.zona(), ubicacion.latitud(), ubicacion.longitud(),
                request.fechaHoraPropuesta(), request.descripcion().trim(),
                request.fechaHoraFinPropuesta()));
        return toResponse(solicitud);
    }

    private LocalizacionUbicacion resolverUbicacion(String direccion, Double latitud, Double longitud) {
        if (latitud != null && longitud != null) {
            // El cliente marcó el punto en el mapa: no hay display_name del cual
            // sacar la zona, así que se resuelve el punto contra el proveedor.
            String zona = geocodingClient.resolverZonaDePunto(latitud, longitud);
            return new LocalizacionUbicacion(direccion.trim(), zona, latitud, longitud);
        }
        return geocodingClient.resolver(direccion)
                .map(c -> new LocalizacionUbicacion(c.direccionCanonica(),
                        com.vinculaup.ms_solicitudes.client.GeocodingClient.extraerZona(c.direccionCanonica()),
                        c.latitud(), c.longitud()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No se pudo determinar la ubicación de la dirección exacta: " + direccion
                                + ". Ajustá la dirección, usá el mapa, o verificá la ubicación por texto."));
    }

    private record LocalizacionUbicacion(String direccion, String zona, Double latitud, Double longitud) {
    }

    /**
     * Identidades con las que puede aparecer el mismo usuario: su id de ms-usuarios, sus alias
     * (por ejemplo el {@code keycloakId} del token) y las identidades del perfil profesional del
     * padrón (id del perfil y usuarioId). Igual que en el listado de solicitudes, esto permite
     * reconocer solicitudes guardadas con cualquiera de esas identidades.
     */
    public Set<UUID> resolverIdentidades(UUID usuarioId, List<UUID> aliasIds) {
        return identidadesDe(usuarioId, aliasIds).ids();
    }

    @Transactional(readOnly = true)
    public List<SolicitudResponse> listarPropias(UUID usuarioId) {
        return listarPropias(usuarioId, List.of(), null, null);
    }

    @Transactional(readOnly = true)
    public List<SolicitudResponse> listarPropias(UUID usuarioId, List<UUID> aliasIds) {
        return listarPropias(usuarioId, aliasIds, null, null);
    }

    /**
     * Solicitudes donde el usuario participa como cliente o profesional.
     * <p>
     * Se resuelven automáticamente las identidades del profesional con ms-profesionales.
     * Si tipo='RECIBIDAS' o rol='PROFESIONAL', devuelve únicamente solicitudes recibidas como profesional.
     * Si tipo='ENVIADAS' o rol='CLIENTE', devuelve únicamente solicitudes enviadas como cliente.
     */
    @Transactional(readOnly = true)
    public List<SolicitudResponse> listarPropias(UUID usuarioId, List<UUID> aliasIds, String tipo, String rol) {
        Set<UUID> identidades = resolverIdentidades(usuarioId, aliasIds);
        if (identidades.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = List.copyOf(identidades);

        boolean soloRecibidas = "RECIBIDAS".equalsIgnoreCase(tipo) || "PROFESIONAL".equalsIgnoreCase(rol);
        boolean soloEnviadas = "ENVIADAS".equalsIgnoreCase(tipo) || "CLIENTE".equalsIgnoreCase(rol);

        List<Solicitud> solicitudes;
        if (soloRecibidas) {
            solicitudes = repository.findByProfesionalIdIn(ids);
        } else if (soloEnviadas) {
            solicitudes = repository.findByClienteIdIn(ids);
        } else {
            solicitudes = repository.findByClienteIdInOrProfesionalIdIn(ids, ids);
        }

        return solicitudes.stream()
                .sorted(Comparator.comparing(Solicitud::getFechaCreacion).reversed())
                .map(this::toResponse)
                .toList();
    }

    public SolicitudResponse aceptar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        ensureProfessionalActor(solicitud, request);
        ensureState(solicitud, EstadoSolicitud.PENDIENTE);
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        return toResponse(solicitud);
    }

    public SolicitudResponse rechazar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        ensureProfessionalActor(solicitud, request);
        ensureState(solicitud, EstadoSolicitud.PENDIENTE);
        solicitud.rechazar(request.motivo());
        return toResponse(solicitud);
    }

    /**
     * El turno se da por terminado desde cualquiera de los dos lados: el profesional
     * que terminó el trabajo o el cliente que confirmó que ya está hecho.
     */
    public SolicitudResponse completar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        ensureParticipante(solicitud, request, "Solo el cliente o el profesional pueden completar la solicitud");
        ensureState(solicitud, EstadoSolicitud.ACEPTADA);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);
        return toResponse(solicitud);
    }

    /**
     * Cancelación desde cualquiera de los dos lados. Se puede cancelar mientras el
     * turno está pendiente de respuesta y también después de haberlo aceptado.
     * <p>
     * El motivo es obligatorio para las dos partes: la contraparte tiene que saber
     * por qué se dio de baja el turno, así que no se acepta una cancelación sin
     * explicación.
     */
    public SolicitudResponse cancelar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        RolCancelacion rol = rolDeParticipante(solicitud, request,
                "Solo el cliente o el profesional pueden cancelar la solicitud");
        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE
                && solicitud.getEstado() != EstadoSolicitud.ACEPTADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La solicitud no permite esta transicion desde " + solicitud.getEstado());
        }
        String motivo = request.motivo() == null ? "" : request.motivo().trim();
        if (motivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Indicá el motivo de la cancelación");
        }
        // Se guarda el id canónico de la parte que canceló (no el alias de Keycloak),
        // así cada lado puede mostrar si la canceló él o la contraparte.
        UUID actor = rol == RolCancelacion.CLIENTE ? solicitud.getClienteId() : solicitud.getProfesionalId();
        solicitud.cancelar(motivo, actor);
        return toResponse(solicitud);
    }

    private Solicitud find(UUID id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    /**
     * Verifica que quien opera sea el profesional dueño de la solicitud y que su perfil siga activo.
     * <p>
     * El {@code profesionalId} guardado en la solicitud puede ser el id del perfil del padrón, el
     * {@code usuarioId} de ms-usuarios o el {@code keycloakId} histórico (las solicitudes viejas se
     * sembraron así). Por eso la comparación se hace contra todas las identidades del actor —las
     * mismas que usa el listado de solicitudes recibidas— en lugar de exigir que la solicitud esté
     * guardada con el id del perfil.
     */
    private void ensureProfessionalActor(Solicitud solicitud, CambiarEstadoRequest request) {
        Identidades actor = identidadesDe(request.actorId(), aliasIdsDe(request));
        ProfesionalIdentidad perfil = actor.perfiles().stream()
                .filter(candidato -> esIdentidadDe(candidato, request.actorId())
                        || esIdentidadDe(candidato, request.keycloakId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "No se pudo verificar el perfil profesional"));
        if (!"ACTIVO".equalsIgnoreCase(perfil.estado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El perfil profesional debe estar activo");
        }
        if (!actor.ids().contains(solicitud.getProfesionalId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El profesional no es dueño de esta solicitud");
        }
    }

    /** El cliente también puede estar guardado con su id de ms-usuarios o con el keycloakId histórico. */
    /** El actor tiene que ser el cliente o el profesional de esa solicitud. */
    private void ensureParticipante(Solicitud solicitud, CambiarEstadoRequest request, String mensaje) {
        rolDeParticipante(solicitud, request, mensaje);
    }

    /**
     * Valida que quien actúa sea parte de la solicitud y devuelve con qué rol lo hace
     * (cliente o profesional). La cancelación guarda ese rol para poder aclarar en la
     * pantalla quién dio de baja el turno.
     */
    private RolCancelacion rolDeParticipante(Solicitud solicitud, CambiarEstadoRequest request, String mensaje) {
        var ids = identidadesDe(request.actorId(), aliasIdsDe(request)).ids();
        boolean esCliente = ids.contains(solicitud.getClienteId());
        boolean esProfesional = ids.stream().anyMatch(identidad -> {
            try {
                return profesionalesClient.obtenerIdentidades(List.of(identidad)).stream()
                        .anyMatch(perfil -> esIdentidadDe(perfil, identidad)
                                || perfil.id().equals(solicitud.getProfesionalId())
                                || perfil.id().equals(identidad));
            } catch (RuntimeException ignored) {
                return false;
            }
        });
        if (!esCliente && !esProfesional) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
        }
        return esCliente ? RolCancelacion.CLIENTE : RolCancelacion.PROFESIONAL;
    }

    private static List<UUID> aliasIdsDe(CambiarEstadoRequest request) {
        return request.keycloakId() == null ? List.of() : List.of(request.keycloakId());
    }

    private static boolean esIdentidadDe(ProfesionalIdentidad perfil, UUID identidad) {
        return identidad != null && (identidad.equals(perfil.id()) || identidad.equals(perfil.usuarioId()));
    }

    /** Identidades del usuario y perfiles profesionales del padrón que las representan. */
    private Identidades identidadesDe(UUID usuarioId, Collection<UUID> aliasIds) {
        Set<UUID> identidades = new LinkedHashSet<>();
        if (usuarioId != null) {
            identidades.add(usuarioId);
        }
        if (aliasIds != null) {
            aliasIds.stream().filter(Objects::nonNull).forEach(identidades::add);
        }
        List<ProfesionalIdentidad> perfiles = identidades.isEmpty()
                ? List.of()
                : profesionalesClient.obtenerIdentidades(identidades);
        if (perfiles == null) {
            perfiles = List.of();
        }
        for (ProfesionalIdentidad perfil : perfiles) {
            if (perfil.id() != null) {
                identidades.add(perfil.id());
            }
            if (perfil.usuarioId() != null) {
                identidades.add(perfil.usuarioId());
            }
        }
        return new Identidades(identidades, perfiles);
    }

    private record Identidades(Set<UUID> ids, List<ProfesionalIdentidad> perfiles) {
    }

    private void ensureState(Solicitud solicitud, EstadoSolicitud expected) {
        if (solicitud.getEstado() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud no permite esta transicion desde " + solicitud.getEstado());
        }
    }

    private boolean estaDentroDeDisponibilidad(UUID profesionalId, LocalDateTime fechaHora) {
        try {
            var disponibilidades = profesionalesClient.obtenerDisponibilidad(profesionalId);
            if (disponibilidades == null || disponibilidades.isEmpty()) {
                return true;
            }
            String diaEsperado = diaEnEspanol(fechaHora.getDayOfWeek());
            return disponibilidades.stream()
                    .filter(item -> item.diaSemana().equalsIgnoreCase(diaEsperado))
                    .anyMatch(item -> !fechaHora.toLocalTime().isBefore(item.horaInicio())
                            && fechaHora.toLocalTime().isBefore(item.horaFin()));
        } catch (Exception e) {
            return true;
        }
    }

    private String diaEnEspanol(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "LUNES";
            case TUESDAY -> "MARTES";
            case WEDNESDAY -> "MIERCOLES";
            case THURSDAY -> "JUEVES";
            case FRIDAY -> "VIERNES";
            case SATURDAY -> "SABADO";
            case SUNDAY -> "DOMINGO";
        };
    }

    private SolicitudResponse toResponse(Solicitud solicitud) {
        return new SolicitudResponse(
                solicitud.getId(), solicitud.getClienteId(), solicitud.getProfesionalId(),
                solicitud.getEspecialidadId(), solicitud.getDireccionServicio(),
                solicitud.getZonaAproximada(), solicitud.getDescripcion(),
                solicitud.getLatitud(), solicitud.getLongitud(),
                solicitud.getFechaHoraPropuesta(), solicitud.getFechaHoraFinPropuesta(), solicitud.getEstado(),
                solicitud.getMotivoCancelacion(), rolQueCancelo(solicitud), solicitud.getFechaCreacion(),
                solicitud.getFechaCambioEstado());
    }

    /** Qué lado canceló el turno, o {@code null} en las solicitudes anteriores al registro. */
    private static RolCancelacion rolQueCancelo(Solicitud solicitud) {
        UUID actor = solicitud.getCanceladaPor();
        if (actor == null || solicitud.getEstado() != EstadoSolicitud.CANCELADA) {
            return null;
        }
        if (actor.equals(solicitud.getClienteId())) {
            return RolCancelacion.CLIENTE;
        }
        if (actor.equals(solicitud.getProfesionalId())) {
            return RolCancelacion.PROFESIONAL;
        }
        return null;
    }
}
