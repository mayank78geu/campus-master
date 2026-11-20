package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.attendance.*;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AttendanceService;
import com.campusmaster.campusmaster.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AuthService authService;

    @PostMapping("/courses/{courseId}/sessions")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> startSession(
            @PathVariable Long courseId,
            @Valid @RequestBody StartAttendanceSessionRequest request) {
        User faculty = authService.getCurrentUser();
        AttendanceSessionResponse response = attendanceService.startSession(courseId, request, faculty);
        return ResponseEntity.ok(ApiResponse.ok(response, "Attendance session started successfully"));
    }

    @GetMapping("/courses/{courseId}/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AttendanceSessionResponse>>> getCourseSessions(
            @PathVariable Long courseId) {
        User user = authService.getCurrentUser();
        List<AttendanceSessionResponse> sessions = attendanceService.getCourseSessions(courseId, user);
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @GetMapping("/courses/{courseId}/my-records")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<AttendanceRecordResponse>>> getMyCourseAttendance(
            @PathVariable Long courseId) {
        User student = authService.getCurrentUser();
        List<AttendanceRecordResponse> records = attendanceService.getStudentCourseAttendance(courseId, student);
        return ResponseEntity.ok(ApiResponse.ok(records));
    }

    @GetMapping("/sessions/{sessionId}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> getSessionDetails(
            @PathVariable Long sessionId) {
        User faculty = authService.getCurrentUser();
        AttendanceSessionResponse response = attendanceService.getSessionDetails(sessionId, faculty);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/sessions/{sessionId}/records")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<List<AttendanceRecordResponse>>> getSessionRecords(
            @PathVariable Long sessionId) {
        User faculty = authService.getCurrentUser();
        List<AttendanceRecordResponse> records = attendanceService.getSessionRecords(sessionId, faculty);
        return ResponseEntity.ok(ApiResponse.ok(records));
    }

    @GetMapping("/sessions/{sessionId}/qr-token")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<QrTokenResponse>> refreshQrToken(
            @PathVariable Long sessionId) {
        User faculty = authService.getCurrentUser();
        QrTokenResponse response = attendanceService.refreshQrToken(sessionId, faculty);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/sessions/{sessionId}/end")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> endSession(
            @PathVariable Long sessionId) {
        User faculty = authService.getCurrentUser();
        AttendanceSessionResponse response = attendanceService.endSession(sessionId, faculty);
        return ResponseEntity.ok(ApiResponse.ok(response, "Attendance session ended successfully"));
    }

    @PostMapping("/sessions/{sessionId}/mark")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> markAttendance(
            @PathVariable Long sessionId,
            @Valid @RequestBody MarkAttendanceRequest request) {
        User student = authService.getCurrentUser();
        AttendanceRecordResponse record = attendanceService.markAttendance(sessionId, request, student);
        return ResponseEntity.ok(ApiResponse.ok(record, "Attendance marked successfully!"));
    }

    @GetMapping("/sessions/{sessionId}/export")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<byte[]> exportSessionRecords(
            @PathVariable Long sessionId) {
        User faculty = authService.getCurrentUser();
        byte[] csvData = attendanceService.exportSessionRecordsCsv(sessionId, faculty);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance_session_" + sessionId + ".csv\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(csvData);
    }
}
