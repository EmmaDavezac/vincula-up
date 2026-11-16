package com.vinculaup.ms_solicitudes.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class CifradorUbicacionesTest {

    private static final String CLAVE = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void cifraLasCoordenadasYLasRecupera() {
        CifradorUbicaciones cifrador = new CifradorUbicaciones(CLAVE);

        String cifrado = cifrador.cifrar(-32.4821);

        assertTrue(cifrador.habilitado());
        assertNotEquals("-32.4821", cifrado);
        assertEquals(-32.4821, cifrador.descifrar(cifrado));
    }

    @Test
    void usaUnIvDistintoParaCadaCifrado() {
        CifradorUbicaciones cifrador = new CifradorUbicaciones(CLAVE);

        assertNotEquals(cifrador.cifrar(-32.4821), cifrador.cifrar(-32.4821));
    }

    @Test
    void conservaCompatibilidadConCoordenadasEnTextoPlanoSiNoHayClave() {
        CifradorUbicaciones cifrador = new CifradorUbicaciones("");

        assertFalse(cifrador.habilitado());
        assertEquals("-32.4821", cifrador.cifrar(-32.4821));
        assertEquals(-32.4821, cifrador.descifrar("-32.4821"));
    }

    @Test
    void devuelveNullParaValoresNulosOVacios() {
        CifradorUbicaciones cifrador = new CifradorUbicaciones(CLAVE);

        assertNull(cifrador.cifrar(null));
        assertNull(cifrador.descifrar(null));
        assertNull(cifrador.descifrar(" "));
    }
}
