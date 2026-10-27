package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.dto.notification.NotificationResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications() {
        User currentUser = authService.getCurrentUser();
        List<NotificationResponse> list = notificationService.getUserNotifications(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        User currentUser = authService.getCurrentUser();
        long count = notificationService.getUnreadCount(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        User currentUser = authService.getCurrentUser();
        notificationService.markAsRead(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "Notification marked as read"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        User currentUser = authService.getCurrentUser();
        notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "All notifications marked as read"));
    }
}
