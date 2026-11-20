package com.campusmaster.campusmaster.dto.notification;

import com.campusmaster.campusmaster.entity.Notification;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("isRead")
    private boolean isRead;

    private Long announcementId;
    private String priority;
    private String authorName;
    private LocalDateTime createdAt;

    @JsonProperty("isRead")
    public boolean isRead() {
        return isRead;
    }

    @JsonProperty("isRead")
    public void setIsRead(boolean isRead) {
        this.isRead = isRead;
    }

    @JsonProperty("read")
    public boolean getRead() {
        return isRead;
    }

    @JsonProperty("read")
    public void setRead(boolean read) {
        this.isRead = read;
    }

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
