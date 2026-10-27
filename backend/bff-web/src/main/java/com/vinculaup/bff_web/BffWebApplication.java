package com.vinculaup.bff_web;

import org.springframework.boot.SpringApplication;
	import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableFeignClients
@SpringBootApplication
public class BffWebApplication {

	public static void main(String[] args) {
		SpringApplication.run(BffWebApplication.class, args);
	}

}
