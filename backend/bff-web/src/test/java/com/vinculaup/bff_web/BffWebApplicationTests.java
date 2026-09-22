package com.vinculaup.bff_web;

import com.vinculaup.bff_web.controller.ApiController;
import com.vinculaup.bff_web.service.BackendGateway;
import com.vinculaup.bff_web.service.KeycloakAdminService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class BffWebApplicationTests {

	@Test
	void contextLoads() {
	}

	private static ApiController controller() {
		return new ApiController(
				new BackendGateway("http://localhost:8081", "http://localhost:8082", "http://localhost:8083"),
				// Sin credenciales de servicio la administración de Keycloak queda deshabilitada.
				new KeycloakAdminService("http://localhost:8080", "vincula-up", "", ""));
	}

	/**
	 * El endpoint de GPS devuelve su contrato de validación sin salir a la red:
	 * una dirección vacía se rechaza localmente en vez de consultar Nominatim.
	 * (La resolución real contra Nominatim no se testea acá porque depende de un
	 * servicio externo y de que la dirección exista en el mundo real.)
	 */
	@Test
	void gpsEndpointRejectsEmptyAddressWithoutCallingExternalServices() {
		Map<String, Object> result = controller().obtenerUbicacionGps("   ");

		assertEquals("empty-query", result.get("source"));
		assertNull(result.get("latitude"));
		assertNull(result.get("longitude"));
		assertTrue(String.valueOf(result.get("error")).contains("vacía"));
	}

}
