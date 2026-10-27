package com.vinculaup.ms_solicitudes;

import org.springframework.boot.SpringApplication;
	import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableFeignClients
@SpringBootApplication
public class MsSolicitudesApplication {

	public static void main(String[] args) {
		SpringApplication.run(MsSolicitudesApplication.class, args);
	}

}
