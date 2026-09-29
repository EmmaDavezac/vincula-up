package com.vinculaup.bff_web.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda los archivos de las fotos de perfil y devuelve la URL pública.
 * <p>
 * Hay dos implementaciones detrás de esta interfaz: {@link FotoStorageLocal}
 * (disco, la que se usa por defecto) y {@link FotoStorageS3} (MinIO o Cloudflare
 * R2). Se elige una u otra con {@code storage.tipo}, así el resto de la
 * aplicación no cambia en ninguno de los dos casos.
 * <p>
 * Lo que se persiste en la base es siempre la URL, nunca el archivo.
 */
public interface FotoStorage {

    /** Formatos de imagen aceptados. SVG queda excluido a propósito: es XML ejecutable. */
    List<String> TIPOS_PERMITIDOS = List.of("image/jpeg", "image/png", "image/webp");

    String FALLBACK = "application/octet-stream";

    /**
     * Resultado de la subida: la URL que se persiste en la base y la clave
     * interna con la que se recupera el archivo.
     */
    record FotoSubida(String url, String key) {
    }

    /** Sube la foto y devuelve la URL pública por la que se puede verla. */
    FotoSubida subir(MultipartFile archivo);

    /**
     * Valida tipo y tamaño, y devuelve la clave interna del archivo.
     * <p>
     * El nombre lo genera un UUID: usar el nombre original permitiría colisiones y
     * rutas manipulables con {@code ../} desde el cliente.
     */
    static String validarYGenerarClave(MultipartFile archivo, String prefix, long maxBytes) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se recibió ningún archivo");
        }
        if (archivo.getSize() > maxBytes) {
            long maxMb = maxBytes / (1024 * 1024);
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "La foto supera el máximo de " + maxMb + " MB. Probá con una imagen más chica.");
        }
        String contentType = archivo.getContentType() == null
                ? FALLBACK
                : archivo.getContentType().toLowerCase(Locale.ROOT);
        if (!TIPOS_PERMITIDOS.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Formato no admitido. Usá JPEG, PNG o WebP.");
        }
        String extension = switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
        return prefix + "/" + UUID.randomUUID() + "." + extension;
    }
}
