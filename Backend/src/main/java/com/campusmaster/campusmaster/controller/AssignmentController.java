package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.assignment.AssignmentResponse;
import com.campusmaster.campusmaster.dto.assignment.CloneAssignmentRequest;
import com.campusmaster.campusmaster.dto.assignment.CreateAssignmentRequest;
import com.campusmaster.campusmaster.dto.assignment.DeadlineResponse;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AssignmentService;
import com.campusmaster.campusmaster.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final AuthService authService;

    @PostMapping("/batches/{batchId}/assignments")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<AssignmentResponse>> createAssignment(
        @PathVariable Long batchId,
        @Valid @RequestBody CreateAssignmentRequest request
    ) {
        User user = authService.getCurrentUser();
        AssignmentResponse response = assignmentService.createAssignment(batchId, request, user);
        return ResponseEntity.ok(ApiResponse.success("Assignment created successfully", response));
    }

    @GetMapping("/batches/{batchId}/assignments")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getBatchAssignments(@PathVariable Long batchId) {
        User user = authService.getCurrentUser();
        List<AssignmentResponse> responses = assignmentService.getBatchAssignments(batchId, user);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> getAssignmentById(@PathVariable Long id) {
        User user = authService.getCurrentUser();
        AssignmentResponse response = assignmentService.getAssignmentById(id, user);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/assignments/{id}/clone")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<AssignmentResponse>> cloneAssignment(
        @PathVariable Long id,
        @Valid @RequestBody CloneAssignmentRequest request
    ) {
        User user = authService.getCurrentUser();
        AssignmentResponse response = assignmentService.cloneAssignment(id, request, user);
        return ResponseEntity.ok(ApiResponse.success("Assignment cloned successfully", response));
    }

    @PostMapping("/assignments/{id}/publish-grades")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<Void>> publishGrades(@PathVariable Long id) {
        User user = authService.getCurrentUser();
        assignmentService.publishGrades(id, user);
        return ResponseEntity.ok(ApiResponse.success("Grades published to students successfully", null));
    }

    @GetMapping("/student/deadlines")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<DeadlineResponse>>> getUpcomingDeadlines() {
        User user = authService.getCurrentUser();
        List<DeadlineResponse> deadlines = assignmentService.getUpcomingDeadlines(user);
        return ResponseEntity.ok(ApiResponse.success(deadlines));
    }
}
