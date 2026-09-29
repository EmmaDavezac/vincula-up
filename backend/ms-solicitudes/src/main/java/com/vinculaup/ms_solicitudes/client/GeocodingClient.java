package com.vinculaup.ms_solicitudes.client;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Geocodificacion de direcciones a coordenadas con Nominatim (OpenStreetMap).
 * <p>
 * Es la <b>unica</b> implementacion del proyecto: el endpoint publico
 * {@code GET /api/gps} del BFF y la creacion de solicitudes pasan por aca. Antes
 * habia dos copias (una en el BFF y otra aca) con timeouts distintos y sin
 * cache, contra un proveedor publico que limita a 1 req/s.
 * <p>
 * Incluye una cache en memoria con TTL: el frontend geocodifica la direccion
 * mientras la persona escribe y la vuelve a pedir al elegir el punto del mapa,
 * asi que la misma direccion se consulta varias veces seguidas.
 * <p>
 * No falla nunca: si el proveedor no responde devuelve {@code resolved: false}
 * con un mensaje, para que el cliente pueda seguir con el mapa o con el texto.
 */
@Component
public class GeocodingClient {

    private static final Logger log = LoggerFactory.getLogger(GeocodingClient.class);

    private static final String URL_BASE = "https://nominatim.openstreetmap.org/search";
    private static final String URL_REVERSA = "https://nominatim.openstreetmap.org/reverse";
    private static final String USER_AGENT = "VinculaUP-App/1.0 (contacto@vincula-up.local)";
    private static final int MAX_ENTRADAS_CACHE = 500;
    private static final long TTL_MILLIS = 10 * 60 * 1000L;

    private final HttpClient httpClient;

    /** Cache LRU con expiry: se poda al insertar cuando supera el maximo. */
    private final Map<String, EntradaCache> cache =
            Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, EntradaCache> eldest) {
                    return size() > MAX_ENTRADAS_CACHE;
                }
            });

    private record EntradaCache(Resultado resultado, long expiraEn) {
        boolean vigente() {
            return System.currentTimeMillis() < expiraEn;
        }
    }

    public GeocodingClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(6))
                .build();
    }

    /** Resultado de la consulta, con el origen para diagnostico. */
    public record Resultado(boolean resolved, Double latitud, Double longitud, String direccion,
                            String source, String error) {
    }

    /** Coordenadas de una direccion resuelta. */
    public record CoordenadasUbicacion(double latitud, double longitud, String direccionCanonica) {
    }

    /**
     * Extrae la zona aproximada de una dirección ya resuelta por Nominatim.
     * <p>
     * El proveedor devuelve el <code>display_name</code> completo, del tipo
     * "Urquiza 1234, Barrio Norte, Concepción del Uruguay". Lo que nos interesa
     * para mostrarle al profesional antes de que acepte es la parte gruesa: el
     * barrio y la localidad alcanzan para saber si le queda lejos o si la zona
     * le resulta insegura, sin revelar la calle ni la altura.
     * <p>
     * Se descarta el primer segmento, que es el de la vía con su altura. No hay
     * forma confiable de distinguirlos por forma, así que se decide por posición:
     * Nominatim ordena de lo más específico a lo más general.
     * <p>
     * Es una función pura: no toca la red, así que es barata de testear.
     *
     * @param displayName dirección canónica devuelta por el proveedor, o null
     * @return la zona aproximada, o null si no hay nada aprovechable
     */
    public static String extraerZona(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return null;
        }
        String[] partes = displayName.split(",");
        if (partes.length < 2) {
            // Una sola parte: no hay de dónde sacar una zona más gruesa.
            return null;
        }
        // El proveedor ordena de lo más específico a lo general: "Urquiza 1234"
        // suele venir como un solo segmento ("Urquiza 1234"), pero a veces partido
        // en dos ("Urquiza", "1234"). No hay forma confiable de distinguirlos por
        // forma, así que se descarta el primer segmento y se toman los dos
        // siguientes: con cualquiera de las dos variantes el primero de esos es el
        // barrio.
        int desde = Math.min(1, partes.length - 1);
        int hasta = Math.min(desde + 2, partes.length);
        StringBuilder zona = new StringBuilder();
        for (int i = desde; i < hasta; i++) {
            String parte = partes[i].trim();
            if (parte.isEmpty()) {
                continue;
            }
            if (!zona.isEmpty()) {
                zona.append(", ");
            }
            zona.append(parte);
        }
        String resultado = zona.toString();
        return resultado.isEmpty() ? null : resultado;
    }

    /**
     * Consulta al proveedor. Nunca lanza: ante cualquier problema devuelve un
     * resultado con {@code resolved = false} y un mensaje apto para mostrar.
     */
    public Resultado consultar(String direccion) {
        String normalizada = direccion == null ? "" : direccion.trim();
        if (normalizada.isEmpty()) {
            return new Resultado(false, null, null, "", "empty-query",
                    "Dirección vacía. Escribí una calle, altura y ciudad.");
        }

        EntradaCache enCache = cache.get(normalizada);
        if (enCache != null && enCache.vigente()) {
            return enCache.resultado();
        }

        Resultado resultado = consultarSinCache(normalizada);
        // Solo se cachean los aciertos: un fallo por red puede ser transitorio y
        // no conviene repetirlo durante 10 minutos.
        if (resultado.resolved()) {
            cache.put(normalizada, new EntradaCache(resultado, System.currentTimeMillis() + TTL_MILLIS));
        }
        return resultado;
    }

    private Resultado consultarSinCache(String direccion) {
        Exception fallo = null;
        Integer status = null;
        try {
            String encoded = URLEncoder.encode(direccion, StandardCharsets.UTF_8);
            String url = URL_BASE + "?q=" + encoded + "&format=json&limit=1&accept-language=es";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Referer", "https://vincula-up.local/")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            status = response.statusCode();
            if (status == 200) {
                return interpretar(response.body(), direccion);
            }
        } catch (Exception ex) {
            fallo = ex;
        }
        String detalle = fallo != null
                ? (fallo.getMessage() == null ? fallo.getClass().getSimpleName() : fallo.getMessage())
                : "HTTP " + status;
        log.debug("Falló la geocodificación de '{}': {}", direccion, detalle);
        return new Resultado(false, null, null, direccion,
                fallo != null ? "nominatim-error" : "nominatim-status-" + status,
                "No se pudo consultar la dirección (" + detalle
                        + "). Probá de nuevo, usá el mapa interactivo o agregá localidad.");
    }

    private Resultado interpretar(String cuerpo, String direccion) {
        try {
            var root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(cuerpo);
            if (root.isArray() && !root.isEmpty()) {
                var primero = root.get(0);
                double lat = primero.path("lat").asDouble(Double.NaN);
                double lon = primero.path("lon").asDouble(Double.NaN);
                if (!Double.isNaN(lat) && !Double.isNaN(lon)) {
                    String mostrada = primero.path("display_name").asText(direccion);
                    return new Resultado(true, lat, lon, mostrada, "nominatim-osm", null);
                }
            }
            return new Resultado(false, null, null, direccion, "nominatim-empty",
                    "No se encontró esa dirección. Intentá agregar altura o localidad.");
        } catch (Exception ex) {
            return new Resultado(false, null, null, direccion, "nominatim-parse",
                    "No se pudo interpretar la respuesta del servicio de mapas.");
        }
    }

    /**
     * Resuelve un punto a la dirección que lo contiene y devuelve solo la zona.
     * <p>
     * Se usa cuando el cliente elige el punto en el mapa y manda coordenadas en
     * vez de escribir la dirección: en ese camino no hay ningún
     * {@code display_name} del cual sacar la zona, así que hay que preguntarle
     * al proveedor. Como entra por la misma caché, no suma consultas repetidas.
     *
     * @return la zona aproximada, o null si el proveedor no pudo resolverla
     */
    public String resolverZonaDePunto(double latitud, double longitud) {
        String clave = String.format(java.util.Locale.ROOT, "%.4f,%.4f", latitud, longitud);
        EntradaCache enCache = cache.get(clave);
        if (enCache != null && enCache.vigente()) {
            return enCache.resultado().direccion();
        }
        try {
            String url = URL_REVERSA + "?lat=" + latitud + "&lon=" + longitud
                    + "&format=json&limit=1&accept-language=es&zoom=14";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Referer", "https://vincula-up.local/")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                var root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.body());
                String zona = extraerZona(root.path("display_name").asText(null));
                if (zona != null) {
                    cache.put(clave, new EntradaCache(
                            new Resultado(true, latitud, longitud, zona, "nominatim-reverso", null),
                            System.currentTimeMillis() + TTL_MILLIS));
                    return zona;
                }
            }
        } catch (Exception ex) {
            log.debug("Falló la geocodificación inversa de ({}, {}): {}", latitud, longitud, ex.getMessage());
        }
        return null;
    }

    /**
     * Versión para uso interno (crear solicitud): devuelve vacío si la dirección
     * no se pudo resolver, para que el llamante decida el error que corresponde.
     */
    public Optional<CoordenadasUbicacion> resolver(String direccion) {
        Resultado resultado = consultar(direccion);
        if (!resultado.resolved()) {
            return Optional.empty();
        }
        return Optional.of(new CoordenadasUbicacion(
                resultado.latitud(), resultado.longitud(), resultado.direccion()));
    }
}
