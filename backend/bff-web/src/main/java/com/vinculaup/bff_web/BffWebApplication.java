package com.vinculaup.bff_web;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.simple.SimpleDiscoveryClientAutoConfiguration;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication(exclude = { SimpleDiscoveryClientAutoConfiguration.class })
public class BffWebApplication {

	public static void main(String[] args) {
		SpringApplication.run(BffWebApplication.class, args);
	}

}
