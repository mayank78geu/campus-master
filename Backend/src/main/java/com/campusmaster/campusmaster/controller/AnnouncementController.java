package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.announcement.AnnouncementResponse;
import com.campusmaster.campusmaster.dto.announcement.CreateAnnouncementRequest;
import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AnnouncementService;
import com.campusmaster.campusmaster.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ApiResponse<AnnouncementResponse>> createAnnouncement(
            @Valid @RequestBody CreateAnnouncementRequest request) {
        User currentUser = authService.getCurrentUser();
        AnnouncementResponse response = announcementService.createAnnouncement(request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Announcement broadcasted successfully to " + response.getRecipientCount() + " students"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> getAnnouncements() {
        User currentUser = authService.getCurrentUser();
        List<AnnouncementResponse> list = announcementService.getFacultyAnnouncements(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PatchMapping("/{id}/revert")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> revertAnnouncement(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        AnnouncementResponse response = announcementService.revertAnnouncement(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Announcement reverted successfully. Student notifications removed."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        announcementService.deleteAnnouncement(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "Announcement deleted successfully"));
    }
}
