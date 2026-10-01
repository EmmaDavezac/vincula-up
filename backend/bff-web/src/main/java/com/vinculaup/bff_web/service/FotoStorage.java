package com.vinculaup.bff_web.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda y devuelve los archivos de las fotos de perfil.
 * <p>
 * Hay una sola implementación, {@link FotoStorageLocal}, que escribe en el volumen
 * de disco del BFF. No hay cliente de bucket: no se usa ningún servicio de
 * objetos.
 * <p>
 * Lo que se persiste en la base es la <b>clave</b> del archivo
 * ({@code perfiles/<uuid>.jpg}), nunca la URL. Las fotos de perfil no son públicas:
 * se piden a {@code GET /api/usuarios/{id}/foto}, que valida sesión y rol antes de
 * devolver los bytes. Por eso acá no se compone ninguna URL pública.
 */
public interface FotoStorage {

    /** Formatos de imagen aceptados. SVG queda excluido a propósito: es XML ejecutable. */
    List<String> TIPOS_PERMITIDOS = List.of("image/jpeg", "image/png", "image/webp");

    String FALLBACK = "application/octet-stream";

    /** Archivo recuperado del almacenamiento, listo para responder. */
    record FotoLeida(byte[] contenido, String contentType) {
    }

    /**
     * Sube la foto y devuelve la clave con la que se recupera después.
     *
     * @see #validarYGenerarClave(MultipartFile, String, long)
     */
    String subir(MultipartFile archivo);

    /**
     * Devuelve el archivo de la clave dada, o {@code null} si no está guardado.
     * Que sea {@code null} no es un error: una foto borrada o una cuenta sin foto
     * se resuelven con las iniciales del avatar.
     */
    FotoLeida leer(String clave);

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
