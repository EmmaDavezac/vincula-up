package com.vinculaup.bff_web.service;

import java.security.SecureRandom;

/**
 * Genera la contraseña temporal que se le envía al profesional recién dado de
 * alta por el administrador.
 * <p>
 * El profesional no se registra: el BFF le crea la cuenta en Keycloak con esta
 * contraseña y Keycloak le exige cambiarla en el primer ingreso
 * ({@code UPDATE_PASSWORD}). Al ser de un solo uso, la contraseña no vence: el
 * profesional puede entrar meses después y el sistema igual lo obliga a
 * definir una propia.
 * <p>
 * El alfabeto excluye los caracteres que se confunden al leerlos o copiarlos
 * ({@code 0}/{@code O} y {@code 1}/{@code l}/{@code I}), porque la contraseña
 * viaja en un correo y va a escribirse a mano.
 */
public final class PasswordTemporal {

    private static final char[] ALFABETO =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789".toCharArray();
    private static final int LONGITUD = 14;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordTemporal() {
    }

    /** Devuelve una contraseña temporal nueva. */
    public static String generar() {
        StringBuilder password = new StringBuilder(LONGITUD);
        for (int i = 0; i < LONGITUD; i++) {
            password.append(ALFABETO[RANDOM.nextInt(ALFABETO.length)]);
        }
        return password.toString();
    }
}
