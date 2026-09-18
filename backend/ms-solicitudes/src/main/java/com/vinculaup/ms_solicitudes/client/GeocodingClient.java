package com.vinculaup.ms_solicitudes.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Geocodificación de direcciones a coordenadas usando Nominatim (OpenStreetMap).
 * Es el mismo proveedor que usa el endpoint GPS del BFF (/api/gps): al crear
 * una solicitud, el backend transforma la dirección textual en coordenadas
 * (o valida las que envía el cliente con el mapa) antes de persistirlas.
 */
@Component
public class GeocodingClient {

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient;

    public GeocodingClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();
    }

    /**
     * Resuelve una dirección a coordenadas (+ dirección canónica).
     * Devuelve vacío si la dirección no se pudo geocodificar.
     */
    public Optional<CoordenadasUbicacion> resolver(String direccion) {
        String normalizada = direccion == null || direccion.isBlank() ? "" : direccion.trim();
        if (normalizada.isEmpty()) {
            return Optional.empty();
        }
        try {
            String encoded = URLEncoder.encode(normalizada, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q=" + encoded
                    + "&format=json&limit=1&accept-language=es";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "VinculaUP-App/1.0 (contacto@vincula-up.local)")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = mapper.readTree(response.body());
                if (root.isArray() && !root.isEmpty()) {
                    JsonNode first = root.get(0);
                    double lat = first.path("lat").asDouble();
                    double lon = first.path("lon").asDouble();
                    if (!Double.isNaN(lat) && !Double.isNaN(lon)) {
                        String displayName = root.get(0).path("display_name").asText(normalizada);
                        return Optional.of(new CoordenadasUbicacion(lat, lon, displayName));
                    }
                }
            }
        } catch (Exception ignorada) {
            // Si el proveedor externo no responde, se deja avanzar con las
            // coordenadas que provea el cliente (si existen).
        }
        return Optional.empty();
    }

    public record CoordenadasUbicacion(double latitud, double longitud, String direccionCanonica) {
    }
}