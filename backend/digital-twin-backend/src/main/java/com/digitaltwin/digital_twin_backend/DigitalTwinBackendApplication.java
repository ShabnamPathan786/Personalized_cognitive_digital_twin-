package com.digitaltwin.digital_twin_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Needed for medicine reminders and routine tracking
@EnableMongoAuditing // Automatically tracks when records (like goals/health logs) are created
public class DigitalTwinBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(DigitalTwinBackendApplication.class, args);
	}

}