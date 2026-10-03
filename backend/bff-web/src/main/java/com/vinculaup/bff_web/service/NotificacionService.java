package com.vinculaup.bff_web.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Avisos por correo al profesional.
 * <p>
 * Hoy el único aviso es el de prerregistro: el administrador da de alta a un
 * profesional en el padrón y ese correo le avisa que ya tiene un lugar en la red
 * y cómo activar su perfil. Reutiliza el mismo SMTP que Keycloak (para el
 * reseteo de contraseña), de modo que no hay credenciales duplicadas.
 * <p>
 * Es best-effort, igual que la promoción de roles: si el SMTP no está
 * configurado o el servidor rechaza el mensaje, el prerregistro queda guardado
 * y se registra el motivo en el log. Dar de alta a un profesional no puede
 * fallar porque un correo no salió.
 * <p>
 * <b>Por qué sale en HTML y no solo en texto plano.</b> Un correo pelado, sin
 * marca y sin formato, se lee como un mensaje automático cualquiera, y en el
 * caso del prerregistro eso es justo lo que más importa: el profesional no
 * sabe si es real o si es phishing. El HTML usa la misma paleta que la
 * aplicación y la maqueta vive en {@code prerregistro.html}, al lado de este
 * archivo, para poder editar el diseño sin tocar el código.
 * <p>
 * <b>Always hay una versión en texto plano.</b> No es adorno: los clientes de
 * correo la usan para decidir si el mensaje es legítimo y los filtros
 * antispam la leen antes que el HTML.
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final String fromDisplayName;
    private final String replyTo;
    private final String contacto;
    private final String appUrl;
    private final String plantilla;

    public NotificacionService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${mail.from:}") String from,
            @Value("${mail.from-display-name:Vincula-UP}") String fromDisplayName,
            @Value("${mail.reply-to:}") String replyTo,
            @Value("${mail.contacto:}") String contacto,
            @Value("${mail.app-url}") String appUrl,
            @Value("${mail.plantilla:/app/correos/prerregistro.html}") String rutaPlantilla) {
        this.mailSender = mailSender;
        this.from = from;
        this.fromDisplayName = fromDisplayName;
        // Cadena de respaldo: Reply-To → contacto → From. Así el .env puede
        // dejar vacía cualquiera de las dos variables y el correo sigue
        // diciendo a dónde escribir, en lugar de dejar las respuestas perdidas.
        this.replyTo = primeroNoVacio(replyTo, contacto, from);
        this.contacto = primeroNoVacio(contacto, replyTo, from);
        this.appUrl = appUrl;
        this.plantilla = leerPlantilla(rutaPlantilla);
    }

    private static String primeroNoVacio(String... valores) {
        for (String valor : valores) {
            if (valor != null && !valor.isBlank()) {
                return valor.trim();
            }
        }
        return "";
    }

    /**
     * Avisa al profesional que el administrador lo prerregistró.
     * <p>
     * El texto va en términos del servicio y no de la implementación: el
     * profesional no tiene por qué saber con qué sistema se guarda su
     * prerregistro, y decirlo le da información que no necesita.
     * <p>
     * Lo importante es que el correo explique el paso que más se confunde:
     * entrar no alcanza, hace falta tener cuenta <b>con ese mismo correo</b>.
     * Es la clave con la que se lo encuentra, y por eso el correo se repite.
     *
     * @param email        correo del profesional (es el que usó el administrador
     *                     al cargarlo en el padrón)
     * @param nombre       nombre con el que se lo ve en la aplicación
     * @param legajo       legajo asignado en el padrón
     * @param especialidad nombre de la especialidad elegida
     * @return {@code true} si el correo salió. Es best-effort: si no se pudo
     *         enviar, el prerregistro queda igual y se le avisa al
     *         administrador.
     */
    public boolean avisarPreregistro(String email, String nombre, String legajo, String especialidad) {
        if (email == null || email.isBlank()) {
            log.warn("No se pudo avisar el prerregistro: el profesional no tiene email");
            return false;
        }
        String saludo = (nombre == null || nombre.isBlank()) ? "" : nombre.strip() + ", ";
        return enviar(email, "Vincula-UP · Tu prerregistro como profesional",
                cuerpoTextoPlano(saludo, email, legajo, especialidad),
                cuerpoHtml(saludo, email, legajo, especialidad));
    }
    /**
     * Versión en texto plano del mismo aviso.
     */
    private String cuerpoTextoPlano(String saludo, String email, String legajo, String especialidad) {
        StringBuilder cuerpo = new StringBuilder();
        cuerpo.append("Hola ").append(saludo).append("\n\n")
                .append("Ya tenés tu lugar en la red técnica de oficios de la Universidad Popular de Concepción del Uruguay.\n\n")
                .append("Tu prerregistro:\n")
                .append("  · Legajo: ").append(legajo).append('\n');
        if (especialidad != null && !especialidad.isBlank()) {
            cuerpo.append("  · Especialidad: ").append(especialidad).append('\n');
        }
        cuerpo.append('\n')
                .append("Para aparecer en el padrón y recibir solicitudes te falta activar tu perfil.\n\n")
                .append("  1. Entrá en ").append(appUrl).append("/activar-perfil\n")
                .append("  2. Iniciá sesión. Si todavía no tenés una cuenta, creala con este correo:\n")
                .append("     ").append(email).append('\n')
                .append("  3. Completá tu perfil: foto, zona de cobertura y horarios.\n\n")
                .append("Usá exactamente esa dirección: es con la que encontramos tu prerregistro.\n\n")
                .append("--\n")
                .append("Vincula-UP · Universidad Popular de Concepción del Uruguay\n");
        if (!contacto.isEmpty()) {
            cuerpo.append("¿Dudas? Escribinos a ").append(contacto).append('\n');
        }
        return cuerpo.toString();
    }

    /**
     * Versión HTML del aviso: carga la plantilla y le coloca los datos del
     * prerregistro.
     */
    private String cuerpoHtml(String saludo, String email, String legajo, String especialidad) {
        if (plantilla == null || plantilla.isBlank()) {
            // Sin maqueta, mejor un correo de texto legible que uno vacío.
            return "<html><body><p>Vincula-UP: tu prerregistro quedó registrado. "
                    + "Entrá en " + escapar(appUrl) + "/activar-perfil para activarlo.</p></body></html>";
        }
        return plantilla
                .replace("{{SALUDO}}", escapar(saludo))
                .replace("{{DATOS}}", filasDatos(legajo, especialidad))
                .replace("{{EMAIL}}", escapar(email))
                .replace("{{APP_URL}}", escapar(appUrl))
                .replace("{{CONTACTO}}", lineaContacto());
    }

    /**
     * Las filas del bloque de datos (legajo y especialidad). Va armado acá y
     * no en la plantilla porque depende de los datos: la especialidad puede o
     * no venir.
     */
    private String filasDatos(String legajo, String especialidad) {
        StringBuilder filas = new StringBuilder();
        filas.append("<tr><td style=\"padding:4px 0;\">Legajo</td>")
                .append("<td align=\"right\" style=\"padding:4px 0;\"><strong>")
                .append(escapar(legajo)).append("</strong></td></tr>");
        if (especialidad != null && !especialidad.isBlank()) {
            filas.append("<tr><td style=\"padding:4px 0;\">Especialidad</td>")
                    .append("<td align=\"right\" style=\"padding:4px 0;\"><strong>")
                    .append(escapar(especialidad)).append("</strong></td></tr>");
        }
        return filas.toString();
    }

    /** Frase del pie con la casilla institucional, o vacía si no hay a quién escribir. */
    private String lineaContacto() {
        if (contacto.isEmpty()) {
            return "";
        }
        return "¿Dudas o algún problema? Escribinos a "
                + "<a href=\"mailto:" + escapar(contacto) + "\">" + escapar(contacto) + "</a>.";
    }

    /** Escapa lo que viene de datos antes de meterlo en el HTML. */
    private static String escapar(String valor) {
        if (valor == null) {
            return "";
        }
        return valor.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
    /**
     * Lee la maqueta del aviso desde una ruta del sistema de archivos.
     * <p>
     * Va por archivo y no por classpath a propósito: dentro del jar empaquetado
     * de Spring Boot el recurso quedó en {@code BOOT-INF/classes/} pero ni
     * {@code ClassPathResource} ni {@code @Value("classpath:...")} llegaron
     * a resolverlo, y el aviso salía con el texto de repuesto. Con el Dockerfile
     * copiándola a un archivo del disco no hay nada que depender.
     */
    private static String leerPlantilla(String ruta) {
        try {
            // Se lee directo, sin preguntar antes con isReadable: esa comprobación
            // daba false en el contenedor aunque el archivo estuviera ahí, y
            // terminaba igual en el texto de repuesto.
            return java.nio.file.Files.readString(java.nio.file.Path.of(ruta),
                    java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException | RuntimeException ex) {
            log.warn("No se pudo leer la maqueta del aviso en {}: {}", ruta, ex.getMessage());
            return "";
        }
    }

    private boolean enviar(String destinatario, String asunto, String textoPlano, String html) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No se envió '{}' a {}: no hay SMTP configurado (KEYCLOAK_SMTP_*)", asunto, destinatario);
            return false;
        }
        try {
            // MimeMessage y no SimpleMailMessage para poder poner el nombre de la
            // organización en el remitente: en la bandeja del profesional se lee
            // "Vincula-UP <correo>" y no la cuenta cruda de Gmail.
            MimeMessage message = sender.createMimeMessage();
            // El 'true' del medio es multipart: hace falta para mandar las dos
            // versiones con setText(texto, html). Con false revienta con "Not in
            // multipart mode" y el aviso no sale.
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (from != null && !from.isBlank()) {
                helper.setFrom(new jakarta.mail.internet.InternetAddress(from, fromDisplayName));
            }
            // Reply-To aparte del From: el From tiene que ser la cuenta
            // autenticada en el SMTP (el servidor rechaza enviar como otra), pero
            // las respuestas pueden ir a la casilla institucional. Sin esto caen
            // en la casilla personal de quien administra la red.
            if (!replyTo.isEmpty() && !replyTo.equalsIgnoreCase(from)) {
                helper.setReplyTo(replyTo);
            }
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(textoPlano, html);
            sender.send(message);
            log.info("Prerregistro avisado por correo a {} (Reply-To: {})", destinatario, replyTo);
            return true;
        } catch (Exception ex) {
            log.warn("No se pudo enviar '{}' a {}: {}", asunto, destinatario, ex.getMessage());
            return false;
        }
    }
}