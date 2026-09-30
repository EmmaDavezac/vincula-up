package com.vinculaup.bff_web.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
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
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final String fromDisplayName;
    private final String appUrl;

    public NotificacionService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${mail.from:}") String from,
            @Value("${mail.from-display-name:Vincula-UP}") String fromDisplayName,
            @Value("${mail.app-url}") String appUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.fromDisplayName = fromDisplayName;
        this.appUrl = appUrl;
    }

    /**
     * Avisa al profesional que el administrador lo prerregistró.
     * <p>
     * @param email     correo del profesional (es el que usó el administrador al
     *                  cargarlo en el padrón)
     * @param nombre    nombre con el que se lo ve en la aplicación
     * @param legajo    legajo asignado en el padrón
     * @param especialidad nombre de la especialidad elegida
     */
    public void avisarPrerregistro(String email, String nombre, String legajo, String especialidad) {
        if (email == null || email.isBlank()) {
            log.warn("No se pudo avisar el prerregistro: el profesional no tiene email");
            return;
        }
        String saludo = (nombre == null || nombre.isBlank()) ? "" : "Hola " + nombre.strip() + ",\n\n";
        String cuerpo = saludo
                + "Ya tenés tu lugar en la red técnica de la Universidad Popular de Concepción del Uruguay.\n\n"
                + "Tu prerregistro:\n"
                + "  · Legajo: " + legajo + "\n"
                + (especialidad == null || especialidad.isBlank() ? "" : "  · Especialidad: " + especialidad + "\n")
                + "\n"
                + "Para aparecer en el padrón y recibir solicitudes te falta activar tu perfil.\n"
                + "Entrá con este mismo correo y completá la activación:\n\n"
                + "  " + appUrl + "/activar-perfil\n\n"
                + "Vas a necesitar una foto de perfil, tu zona de cobertura y los horarios\n"
                + "en los que podés trabajar.\n\n"
                + "Si no esperabas este correo, ignoralo y respondé a la Universidad Popular.\n";

        enviar(email, "Vincula-UP | Tu prerregistro como profesional", cuerpo);
    }

    private void enviar(String destinatario, String asunto, String cuerpo) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No se envió '{}' a {}: no hay SMTP configurado (KEYCLOAK_SMTP_*)", asunto, destinatario);
            return;
        }
        try {
            // MimeMessage y no SimpleMailMessage para poder poner el nombre de la
            // organización en el remitente: en la bandeja del profesional se lee
            // "Vincula-UP <correo>" y no la cuenta cruda de Gmail.
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            if (from != null && !from.isBlank()) {
                helper.setFrom(new jakarta.mail.internet.InternetAddress(from, fromDisplayName));
            }
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(cuerpo, false);
            sender.send(message);
            log.info("Prerregistro avisado por correo a {}", destinatario);
        } catch (Exception ex) {
            log.warn("No se pudo enviar '{}' a {}: {}", asunto, destinatario, ex.getMessage());
        }
    }
}
