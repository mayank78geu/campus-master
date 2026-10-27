package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.dto.course.CourseResponse;
import com.campusmaster.campusmaster.dto.course.CreateCourseRequest;
import com.campusmaster.campusmaster.dto.course.UnitRequest;
import com.campusmaster.campusmaster.dto.course.UnitResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        User currentUser = authService.getCurrentUser();
        CourseResponse response = courseService.createCourse(request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Course created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getMyCourses() {
        User currentUser = authService.getCurrentUser();
        List<CourseResponse> response = courseService.getCoursesForUser(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseById(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        CourseResponse response = courseService.getCourseById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}/units")
    public ResponseEntity<ApiResponse<List<UnitResponse>>> updateUnits(
            @PathVariable Long id,
            @RequestBody List<UnitRequest> unitRequests) {
        User currentUser = authService.getCurrentUser();
        List<UnitResponse> response = courseService.updateUnits(id, unitRequests, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Units updated successfully"));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<CourseResponse>> archiveCourse(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        CourseResponse response = courseService.archiveCourse(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Course archived successfully"));
    }

    @PostMapping("/{id}/co-faculty")
    public ResponseEntity<ApiResponse<CourseResponse>> addCoFaculty(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        User currentUser = authService.getCurrentUser();
        CourseResponse response = courseService.addCoFaculty(id, email, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Co-faculty added successfully"));
    }
}
