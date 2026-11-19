package com.campusmaster.campusmaster.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "campusmaster.storage.provider", havingValue = "cloudinary")
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudName == null || cloudName.isBlank() ||
            apiKey == null || apiKey.isBlank() ||
            apiSecret == null || apiSecret.isBlank()) {
            throw new IllegalStateException("Cloudinary storage provider is active, but required credentials (cloudinary.cloud-name, cloudinary.api-key, cloudinary.api-secret) are missing or blank.");
        }

        return new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName.trim(),
            "api_key", apiKey.trim(),
            "api_secret", apiSecret.trim(),
            "secure", true
        ));
    }
}
