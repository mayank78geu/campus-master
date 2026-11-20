package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.dto.profile.ProfileResponse;
import com.campusmaster.campusmaster.dto.profile.UpdateProfileRequest;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {
        User user = authService.getCurrentUser();
        ProfileResponse response = profileService.getProfile(user);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User user = authService.getCurrentUser();
        ProfileResponse response = profileService.updateProfile(user, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Profile updated successfully"));
    }
}
