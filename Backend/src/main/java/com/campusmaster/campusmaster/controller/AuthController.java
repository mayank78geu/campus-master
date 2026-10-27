package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.auth.AuthResponse;
import com.campusmaster.campusmaster.dto.auth.LoginRequest;
import com.campusmaster.campusmaster.dto.auth.RegisterRequest;
import com.campusmaster.campusmaster.dto.auth.UserResponse;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Account created successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Login successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        UserResponse response = authService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
