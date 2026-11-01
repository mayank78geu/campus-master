package com.campusmaster.campusmaster.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class FileSignatureService {

    private final byte[] secretKeyBytes;

    public FileSignatureService(@Value("${app.jwt.secret}") String jwtSecret) {
        if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
            throw new IllegalArgumentException("JWT secret must be configured for file signatures");
        }
        this.secretKeyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
    }

    public String generateSignature(String path, long exp) {
        try {
            String data = path + ":" + exp;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secretKeyBytes, "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Could not generate file signature", e);
        }
    }

    public boolean verifySignature(String path, Long exp, String sig) {
        if (path == null || exp == null || sig == null || sig.isBlank()) {
            return false;
        }

        long now = Instant.now().getEpochSecond();
        if (exp < now) {
            return false; // Expired
        }

        try {
            String expectedSig = generateSignature(path, exp);
            return MessageDigest.isEqual(
                expectedSig.getBytes(StandardCharsets.UTF_8),
                sig.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            return false;
        }
    }

    public String generateSignedUrl(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        long exp = Instant.now().plusSeconds(300).getEpochSecond(); // 5-minute expiry per D4
        String sig = generateSignature(path, exp);
        return "/api/v1/files/" + path + "?exp=" + exp + "&sig=" + sig;
    }
}
