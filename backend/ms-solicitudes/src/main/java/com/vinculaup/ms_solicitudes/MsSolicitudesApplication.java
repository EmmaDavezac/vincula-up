package com.vinculaup.ms_solicitudes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.simple.SimpleDiscoveryClientAutoConfiguration;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication(exclude = { SimpleDiscoveryClientAutoConfiguration.class })
public class MsSolicitudesApplication {

	public static void main(String[] args) {
		SpringApplication.run(MsSolicitudesApplication.class, args);
	}

}
