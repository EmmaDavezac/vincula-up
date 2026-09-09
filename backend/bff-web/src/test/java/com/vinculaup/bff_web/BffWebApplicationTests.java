package com.vinculaup.bff_web;

import com.vinculaup.bff_web.controller.ApiController;
import com.vinculaup.bff_web.service.BackendGateway;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class BffWebApplicationTests {

	@Test
	void contextLoads() {
	}

	@Test
	void gpsEndpointReturnsDemoCoordinatesForRequestAddress() {
		ApiController controller = new ApiController(new BackendGateway(
				"http://localhost:8081",
				"http://localhost:8082",
				"http://localhost:8083"));

		Map<String, Object> result = controller.obtenerUbicacionGps("Calle Falsa 123");

		assertEquals("Calle Falsa 123", result.get("address"));
		assertEquals("demo-gps", result.get("source"));
		assertNotNull(result.get("latitude"));
		assertNotNull(result.get("longitude"));
	}

}
