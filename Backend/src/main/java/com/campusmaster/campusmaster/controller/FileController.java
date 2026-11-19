package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.service.storage.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final StorageService storageService;

    @GetMapping("/**")
    public ResponseEntity<?> downloadFile(HttpServletRequest request) {
        // Extract full path after /api/v1/files/
        String fullPath = request.getRequestURI().substring("/api/v1/files/".length());

        String downloadUrl = storageService.getDownloadUrl(fullPath);
        if (downloadUrl != null && (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://"))) {
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(downloadUrl))
                .header("X-Content-Type-Options", "nosniff")
                .build();
        }

        Resource resource = storageService.loadFileAsResource(fullPath);
        String filename = resource.getFilename() != null ? resource.getFilename() : fullPath;

        String contentType = MediaTypeFactory.getMediaType(filename)
            .map(MediaType::toString)
            .orElse("application/octet-stream");

        String lowerExt = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex >= 0) {
            lowerExt = filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        }

        // Safe previewable types (SVG is explicitly served as attachment to prevent XSS)
        boolean isSafeInline = !lowerExt.equals("svg") && (
            contentType.equals("application/pdf") ||
            contentType.equals("image/png") ||
            contentType.equals("image/jpeg") ||
            contentType.equals("image/gif") ||
            contentType.equals("image/webp")
        );

        String disposition = isSafeInline
            ? "inline; filename=\"" + filename + "\""
            : "attachment; filename=\"" + filename + "\"";

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
            .header("X-Content-Type-Options", "nosniff")
            .body(resource);
    }
}
