package com.vinculaup.bff_web.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda las fotos en el sistema de archivos del servidor, en un volumen Docker.
 * <p>
 * Es la única implementación: no necesita ningún servicio extra levantado, así que
 * el stack arranca sin descargas adicionales. El archivo se guarda con una clave
 * ({@code perfiles/<uuid>.jpg}) y se devuelve leyendo de ese mismo volumen; en la
 * base queda solo la clave.
 */
@org.springframework.stereotype.Service
public class FotoStorageLocal implements FotoStorage {

    private static final Logger log = LoggerFactory.getLogger(FotoStorageLocal.class);

    private final Path raiz;
    private final String prefix;
    private final long maxBytes;

    public FotoStorageLocal(
            @Value("${storage.local.dir:/data/fotos}") String dir,
            @Value("${storage.prefix}") String prefix,
            @Value("${storage.max-bytes}") long maxBytes) {
        this.raiz = Path.of(dir);
        this.prefix = prefix;
        this.maxBytes = maxBytes;
        try {
            Files.createDirectories(raiz);
            log.info("Fotos en disco local: {}", raiz.toAbsolutePath());
        } catch (IOException ex) {
            log.warn("No se pudo preparar el directorio de fotos {}: {}", raiz, ex.getMessage());
        }
    }

    @Override
    public String subir(MultipartFile archivo) {
        String key = FotoStorage.validarYGenerarClave(archivo, prefix, maxBytes);
        // La clave la genera validarYGenerarClave con un UUID, así que no viene
        // del cliente: aun así se normaliza antes de tocar el disco.
        Path destino = resolver(key);
        if (destino == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de archivo inválida");
        }
        try {
            Files.createDirectories(destino.getParent());
            Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            log.error("Falló la escritura de {}: {}", key, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo guardar la foto. Intentá de nuevo en un momento.");
        }
        return key;
    }

    @Override
    public FotoLeida leer(String clave) {
        Path origen = resolver(clave);
        if (origen == null || !Files.isRegularFile(origen)) {
            return null;
        }
        try {
            return new FotoLeida(Files.readAllBytes(origen), contentTypeDe(clave));
        } catch (IOException ex) {
            log.warn("No se pudo leer {}: {}", clave, ex.getMessage());
            return null;
        }
    }

    /**
     * Resuelve la clave dentro del volumen, o {@code null} si la clave intenta
     * salir de él ({@code ../}). Es la misma guarda que evita que una clave
     * manipulada alcance otra parte del disco del contenedor.
     */
    private Path resolver(String clave) {
        if (clave == null || clave.isBlank()) {
            return null;
        }
        Path destino = raiz.resolve(clave.trim()).normalize();
        return destino.startsWith(raiz) ? destino : null;
    }

    /**
     * Tipo de contenido según la extensión. La clave la genera
     * {@link FotoStorage#validarYGenerarClave} a partir del tipo que declaró el
     * cliente, así que acá solo se traduce de vuelta.
     */
    private String contentTypeDe(String clave) {
        String nombre = clave.toLowerCase(Locale.ROOT);
        if (nombre.endsWith(".png")) {
            return "image/png";
        }
        if (nombre.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }
}
