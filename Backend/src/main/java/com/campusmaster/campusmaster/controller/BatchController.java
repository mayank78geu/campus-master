package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.batch.BatchResponse;
import com.campusmaster.campusmaster.dto.batch.CreateBatchRequest;
import com.campusmaster.campusmaster.dto.batch.EnrollmentResponse;
import com.campusmaster.campusmaster.dto.batch.JoinBatchRequest;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.EnrollmentStatus;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;
    private final AuthService authService;

    @PostMapping("/courses/{courseId}/batches")
    public ResponseEntity<ApiResponse<BatchResponse>> createBatch(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateBatchRequest request) {
        User currentUser = authService.getCurrentUser();
        BatchResponse response = batchService.createBatch(courseId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Batch created successfully"));
    }

    @GetMapping("/courses/{courseId}/batches")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> getBatchesByCourse(@PathVariable Long courseId) {
        User currentUser = authService.getCurrentUser();
        List<BatchResponse> response = batchService.getBatchesByCourse(courseId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/batches/{id}/join-code/regenerate")
    public ResponseEntity<ApiResponse<BatchResponse>> regenerateJoinCode(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        BatchResponse response = batchService.regenerateJoinCode(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Join code regenerated successfully"));
    }

    @PostMapping("/batches/join")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> joinBatch(@Valid @RequestBody JoinBatchRequest request) {
        User currentUser = authService.getCurrentUser();
        EnrollmentResponse response = batchService.joinBatchWithCode(request.getJoinCode(), currentUser);
        String msg = (response.getStatus() == EnrollmentStatus.ACTIVE) 
            ? "Successfully joined batch" 
            : "Join request submitted. Awaiting faculty approval.";
        return ResponseEntity.ok(ApiResponse.ok(response, msg));
    }

    @GetMapping("/batches/{id}/enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getBatchEnrollments(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        List<EnrollmentResponse> response = batchService.getBatchRoster(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/batches/{id}/enrollments/{enrollmentId}")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> updateEnrollmentStatus(
            @PathVariable Long id,
            @PathVariable Long enrollmentId,
            @RequestBody Map<String, String> payload) {
        String statusStr = payload.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status is required (ACTIVE, PENDING, REMOVED)"));
        }
        EnrollmentStatus status = EnrollmentStatus.valueOf(statusStr.toUpperCase());
        User currentUser = authService.getCurrentUser();
        EnrollmentResponse response = batchService.updateEnrollmentStatus(id, enrollmentId, status, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Enrollment status updated to " + status));
    }

    @PatchMapping("/batches/{id}/toggle-status")
    public ResponseEntity<ApiResponse<BatchResponse>> toggleBatchStatus(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        BatchResponse response = batchService.toggleBatchStatus(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Batch status updated to " + response.getStatus()));
    }

    @PostMapping("/batches/{id}/students")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> addStudents(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> payload) {
        List<String> emails = payload.get("emails");
        if (emails == null || emails.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("List of student emails is required"));
        }
        User currentUser = authService.getCurrentUser();
        List<EnrollmentResponse> responses = batchService.addStudentsByEmail(id, emails, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(responses, "Enrolled " + responses.size() + " students successfully"));
    }
}
