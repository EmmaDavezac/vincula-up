package com.vinculaup.ms_solicitudes.config;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Cifra las coordenadas en reposo con AES-256-GCM.
 * <p>
 * La base guarda la ubicacion de los vecinos y la zona de cobertura de los
 * profesionales. Con el cifrado, un dump de la base no expone esa informacion:
 * el texto guardado no es una coordenada valida.
 * <p>
 * <b>Consecuencia a tener en cuenta:</b> las columnas cifradas no admiten
 * consultas espaciales (ni WHERE latitud BETWEEN, ni orden por cercania en
 * SQL). Hoy eso no afecta: el orden por cercania se calcula en el navegador con
 * las coordenadas que la API devuelve ya descifradas, y el radio de cobertura
 * se persiste pero no se usa para filtrar. Si alguna vez hace falta filtrar
 * por distancia en SQL, hay que agregar una columna en claro deliberada.
 * <p>
 * GCM usa un IV aleatorio por cifrado: dos coordenadas iguales producen textos
 * distintos. El resultado es base64(iv || cifrado), con el IV de 12 bytes al
 * principio para poder descifrar.
 */
@Component
public class CifradorUbicaciones {

    private static final Logger log = LoggerFactory.getLogger(CifradorUbicaciones.class);

    private static final String TRANSFORMACION = "AES/GCM/NoPadding";
    private static final int LONGITUD_IV = 12;
    private static final int LONGITUD_CLAVE = 32;
    private static final int LONGITUD_TAG = 128;

    private final SecretKeySpec clave;
    private final boolean habilitado;

    public CifradorUbicaciones(@Value("${ubicaciones.clave:}") String claveBase64) {
        byte[] bytes = decodificar(claveBase64);
        if (bytes == null) {
            // Sin clave no se cifra, pero el servicio arranca igual: en desarrollo
            // y en los tests se sigue pudiendo trabajar. En un despliegue real la
            // clave es obligatoria, y el aviso deja constancia de que falta.
            this.clave = null;
            this.habilitado = false;
            log.warn("UBICACIONES_CLAVE no definida: las coordenadas se guardan sin cifrar. "
                    + "Genera una con 'openssl rand -base64 32' y defini la variable.");
        } else {
            this.clave = new SecretKeySpec(bytes, "AES");
            this.habilitado = true;
        }
    }

    @jakarta.annotation.PostConstruct
    void registrarEnEntidad() {
        com.vinculaup.ms_solicitudes.entity.Solicitud.registrarCifrador(this);
        log.info("Cifrado de coordenadas en reposo: {}", habilitado ? "activo" : "inactivo (sin clave)");
    }

    private byte[] decodificar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(valor.trim());
            return bytes.length == LONGITUD_CLAVE ? bytes : null;
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /**
     * Cifra un valor numerico. Devuelve null si la entrada es nula, para no
     * convertir un campo opcional en obligatorio.
     */
    public String cifrar(Double valor) {
        if (valor == null) {
            return null;
        }
        return cifrarTexto(String.valueOf(valor));
    }

    private String cifrarTexto(String texto) {
        if (!habilitado) {
            return texto;
        }
        try {
            byte[] iv = new byte[LONGITUD_IV];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMACION);
            cipher.init(Cipher.ENCRYPT_MODE, clave, new GCMParameterSpec(LONGITUD_TAG, iv));
            byte[] cifrado = cipher.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            byte[] salida = new byte[iv.length + cifrado.length];
            System.arraycopy(iv, 0, salida, 0, iv.length);
            System.arraycopy(cifrado, 0, salida, iv.length, cifrado.length);
            return Base64.getEncoder().encodeToString(salida);
        } catch (Exception ex) {
            // Si el cifrado falla se registra y se devuelve el valor original: es
            // preferible guardar sin cifrar antes que perder la coordenada.
            log.error("No se pudo cifrar la coordenada: {}", ex.getMessage());
            return texto;
        }
    }

    /** Descifra un valor numerico. Devuelve null si la entrada es nula. */
    public Double descifrar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return descifrarTexto(valor);
    }

    private Double descifrarTexto(String texto) {
        if (!habilitado) {
            return parsear(texto);
        }
        try {
            byte[] entrada = Base64.getDecoder().decode(texto);
            if (entrada.length <= LONGITUD_IV) {
                return null;
            }
            byte[] iv = new byte[LONGITUD_IV];
            System.arraycopy(entrada, 0, iv, 0, LONGITUD_IV);
            byte[] cifrado = new byte[entrada.length - LONGITUD_IV];
            System.arraycopy(entrada, LONGITUD_IV, cifrado, 0, cifrado.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMACION);
            cipher.init(Cipher.DECRYPT_MODE, clave, new GCMParameterSpec(LONGITUD_TAG, iv));
            return parsear(new String(cipher.doFinal(cifrado), StandardCharsets.UTF_8));
        } catch (Exception ex) {
            // Texto que no es ciphertext valido: puede ser un valor guardado antes
            // del cifrado, o una clave distinta. Se intenta leer como numero.
            log.debug("El valor no se pudo descifrar, se interpreta como texto plano: {}", ex.getMessage());
            return parsear(texto);
        }
    }

    private Double parsear(String texto) {
        try {
            return Double.valueOf(texto.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Indica si el cifrado esta activo. Lo usan los tests y el arranque. */
    public boolean habilitado() {
        return habilitado;
    }
}
