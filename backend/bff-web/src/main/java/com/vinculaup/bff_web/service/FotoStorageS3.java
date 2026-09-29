package com.vinculaup.bff_web.service;

import java.io.IOException;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Sube las fotos a un bucket compatible con S3: MinIO autohospedado, o Cloudflare
 * R2 cambiando el endpoint y las credenciales.
 * <p>
 * Se activa con {@code storage.tipo=s3}. Es la opción para cuando haya acceso a
 * un bucket: a diferencia de {@link FotoStorageLocal}, no depende de que el
 * servidor de archivos esté levantado en la red local.
 */
@org.springframework.stereotype.Service
@ConditionalOnProperty(name = "storage.tipo", havingValue = "s3", matchIfMissing = false)
public class FotoStorageS3 implements FotoStorage {

    private static final Logger log = LoggerFactory.getLogger(FotoStorageS3.class);

    private final S3Client s3;
    private final String bucket;
    private final String publicUrl;
    private final String prefix;
    private final long maxBytes;

    public FotoStorageS3(
            @Value("${storage.endpoint}") String endpoint,
            @Value("${storage.access-key}") String accessKey,
            @Value("${storage.secret-key}") String secretKey,
            @Value("${storage.bucket}") String bucket,
            @Value("${storage.public-url}") String publicUrl,
            @Value("${storage.prefix}") String prefix,
            @Value("${storage.max-bytes}") long maxBytes) {
        this.bucket = bucket;
        // La URL pública puede traer barra final: se normaliza para no duplicarla.
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        this.prefix = prefix;
        this.maxBytes = maxBytes;
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .build();
    }

    /**
     * Sube la foto al bucket y devuelve la URL pública.
     * <p>
     * La clave la genera la interfaz con un UUID: usar el nombre original
     * permitiría colisiones y rutas manipulables con {@code ../}.
     */
    @Override
    public FotoSubida subir(MultipartFile archivo) {
        String key = FotoStorage.validarYGenerarClave(archivo, prefix, maxBytes);
        String contentType = archivo.getContentType() == null
                ? FALLBACK
                : archivo.getContentType();

        try {
            s3.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromInputStream(archivo.getInputStream(), archivo.getSize()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo leer el archivo enviado");
        } catch (S3Exception ex) {
            log.error("Falló la subida a {} ({}): {}", bucket, key, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo guardar la foto. Intentá de nuevo en un momento.");
        }

        return new FotoSubida(publicUrl + "/" + key, key);
    }
}
