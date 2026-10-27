package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.batch.BatchAnalyticsResponse;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AnalyticsService;
import com.campusmaster.campusmaster.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AuthService authService;

    @GetMapping("/analytics/batches/{batchId}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<BatchAnalyticsResponse>> getBatchAnalytics(@PathVariable Long batchId) {
        User faculty = authService.getCurrentUser();
        BatchAnalyticsResponse analytics = analyticsService.getBatchAnalytics(batchId, faculty);
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }

    @GetMapping("/batches/{batchId}/export-grades")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<byte[]> exportGradesCsv(@PathVariable Long batchId) {
        User faculty = authService.getCurrentUser();
        String csvContent = analyticsService.generateGradesCsv(batchId, faculty);
        byte[] bytes = csvContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch_" + batchId + "_grades.csv\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }

    @GetMapping("/batches/{batchId}/export-roster")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<byte[]> exportRosterCsv(@PathVariable Long batchId) {
        User faculty = authService.getCurrentUser();
        String csvContent = analyticsService.generateRosterCsv(batchId, faculty);
        byte[] bytes = csvContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch_" + batchId + "_roster.csv\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }
}
