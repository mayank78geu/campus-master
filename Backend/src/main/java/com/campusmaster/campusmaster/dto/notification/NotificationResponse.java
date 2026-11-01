package com.campusmaster.campusmaster.dto.notification;

import com.campusmaster.campusmaster.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String eventType;
    private String targetUrl;
    private boolean isRead;
    private Long announcementId;
    private String priority;
    private String authorName;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .title(n.getTitle())
            .message(n.getMessage())
            .eventType(n.getEventType())
            .targetUrl(n.getTargetUrl())
            .isRead(n.isRead())
            .announcementId(n.getAnnouncement() != null ? n.getAnnouncement().getId() : null)
            .priority(n.getPriority())
            .authorName(n.getAuthorName())
            .createdAt(n.getCreatedAt())
            .build();
    }
}
