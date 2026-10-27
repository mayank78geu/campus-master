package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.service.storage.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final StorageService storageService;

    @GetMapping("/**")
    public ResponseEntity<Resource> downloadFile(HttpServletRequest request) {
        // Extract full path after /api/v1/files/
        String fullPath = request.getRequestURI().substring("/api/v1/files/".length());
        Resource resource = storageService.loadFileAsResource(fullPath);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // fallback
        }
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        // For PDF and images, use inline so browser previews directly
        boolean isPreviewable = contentType.startsWith("image/") || contentType.equals("application/pdf");
        String disposition = isPreviewable ? "inline" : "attachment; filename=\"" + resource.getFilename() + "\"";

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
            .body(resource);
    }
}
