package com.vinculaup.bff_web.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda las fotos en el sistema de archivos del servidor, en un volumen Docker.
 * <p>
 * Es la implementación por defecto ({@code storage.tipo=local}, o simply
 * indefinido): no necesita ningún servicio extra levantado, así que el stack
 * arranca sin descargas adicionales. En la base queda solo la URL.
 * <p>
 * Para pasar a MinIO o Cloudflare R2 se cambia {@code storage.tipo=s3}; el resto
 * de la aplicación no se toca, porque las dos implementaciones cumplen la misma
 * interfaz ({@link FotoStorage}).
 */
@org.springframework.stereotype.Service
@ConditionalOnProperty(name = "storage.tipo", havingValue = "local", matchIfMissing = true)
public class FotoStorageLocal implements FotoStorage {

    private static final Logger log = LoggerFactory.getLogger(FotoStorageLocal.class);

    private final Path raiz;
    private final String publicUrl;
    private final String prefix;
    private final long maxBytes;

    public FotoStorageLocal(
            @Value("${storage.local.dir:/data/fotos}") String dir,
            @Value("${storage.public-url}") String publicUrl,
            @Value("${storage.prefix}") String prefix,
            @Value("${storage.max-bytes}") long maxBytes) {
        this.raiz = Path.of(dir);
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
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
    public FotoSubida subir(MultipartFile archivo) {
        String key = FotoStorage.validarYGenerarClave(archivo, prefix, maxBytes);
        // La clave la genera validarYGenerarClave con un UUID, así que no viene
        // del cliente: aun así se normaliza antes de tocar el disco.
        Path destino = raiz.resolve(key).normalize();
        if (!destino.startsWith(raiz)) {
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
        return new FotoSubida(publicUrl + "/" + key, key);
    }
}
