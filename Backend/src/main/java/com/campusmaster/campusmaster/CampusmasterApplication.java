package com.campusmaster.campusmaster;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

@SpringBootApplication
public class CampusmasterApplication {

    private static final Logger log = LoggerFactory.getLogger(CampusmasterApplication.class);

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(CampusmasterApplication.class, args);
    }

    private static void loadDotenv() {
        // Look for .env in current directory, Backend/, or parent directory
        List<File> candidates = List.of(
                new File(".env"),
                new File("Backend/.env"),
                new File("../.env")
        );

        File found = null;
        for (File file : candidates) {
            if (file.exists() && file.isFile()) {
                found = file;
                break;
            }
        }

        if (found != null) {
            log.info("Loading environment configuration from: {}", found.getAbsolutePath());
            try (BufferedReader reader = new BufferedReader(new FileReader(found, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIdx = line.indexOf('=');
                    if (eqIdx > 0) {
                        String key = line.substring(0, eqIdx).trim();
                        String value = line.substring(eqIdx + 1).trim();
                        if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (System.getenv(key) == null && System.getProperty(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to read .env file at {}: {}", found.getAbsolutePath(), e.getMessage());
            }
        }

        // Check if APP_JWT_SECRET was provided via env or .env
        String currentSecret = System.getenv("APP_JWT_SECRET");
        if (currentSecret == null || currentSecret.isBlank()) {
            currentSecret = System.getProperty("APP_JWT_SECRET");
        }

        String profile = System.getenv("SPRING_PROFILES_ACTIVE");
        if (profile == null) {
            profile = System.getProperty("SPRING_PROFILES_ACTIVE", "local");
        }

        // For local development, if secret is still missing, auto-generate a secure 512-bit key and write .env
        if ((currentSecret == null || currentSecret.isBlank()) && !"prod".equalsIgnoreCase(profile) && !"production".equalsIgnoreCase(profile)) {
            byte[] keyBytes = new byte[64];
            new SecureRandom().nextBytes(keyBytes);
            String autoSecret = Base64.getEncoder().encodeToString(keyBytes);
            System.setProperty("APP_JWT_SECRET", autoSecret);
            log.warn("No APP_JWT_SECRET provided. Generated secure development JWT secret for local session.");

            if (found == null) {
                try {
                    File targetEnv = new File(".env");
                    try (PrintWriter pw = new PrintWriter(new FileWriter(targetEnv, StandardCharsets.UTF_8))) {
                        pw.println("# Campus Master - Auto-generated local environment configuration");
                        pw.println("SPRING_PROFILES_ACTIVE=local");
                        pw.println("SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/campusmaster?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true");
                        pw.println("SPRING_DATASOURCE_USERNAME=root");
                        pw.println("SPRING_DATASOURCE_PASSWORD=root");
                        pw.println("APP_JWT_SECRET=" + autoSecret);
                        pw.println("APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000");
                        pw.println("CAMPUSMASTER_STORAGE_PROVIDER=local");
                    }
                    log.info("Created local .env file with secure configuration at: {}", targetEnv.getAbsolutePath());
                } catch (Exception e) {
                    log.debug("Could not write local .env file: {}", e.getMessage());
                }
            }
        }
    }
}
