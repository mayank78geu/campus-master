package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.assignment.GradeSubmissionRequest;
import com.campusmaster.campusmaster.dto.assignment.SubmissionResponse;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final AuthService authService;

    @PostMapping(value = "/assignments/{assignmentId}/submissions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitAssignment(
        @PathVariable Long assignmentId,
        @RequestParam(value = "textContent", required = false) String textContent,
        @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) {
        User student = authService.getCurrentUser();
        SubmissionResponse response = submissionService.submitAssignment(assignmentId, textContent, files, student);
        return ResponseEntity.ok(ApiResponse.success("Assignment submitted successfully. Receipt generated.", response));
    }

    @GetMapping("/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getAssignmentSubmissions(@PathVariable Long assignmentId) {
        User faculty = authService.getCurrentUser();
        List<SubmissionResponse> submissions = submissionService.getAssignmentSubmissions(assignmentId, faculty);
        return ResponseEntity.ok(ApiResponse.success(submissions));
    }

    @PatchMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<SubmissionResponse>> gradeSubmission(
        @PathVariable Long submissionId,
        @Valid @RequestBody GradeSubmissionRequest request
    ) {
        User faculty = authService.getCurrentUser();
        SubmissionResponse response = submissionService.gradeSubmission(submissionId, request, faculty);
        return ResponseEntity.ok(ApiResponse.success("Submission graded successfully", response));
    }

    @GetMapping("/submissions/receipt/{receiptToken}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionByReceipt(@PathVariable String receiptToken) {
        SubmissionResponse response = submissionService.getSubmissionByReceipt(receiptToken);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
