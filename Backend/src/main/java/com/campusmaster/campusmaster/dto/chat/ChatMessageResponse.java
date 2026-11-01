package com.campusmaster.campusmaster.dto.chat;

import com.campusmaster.campusmaster.entity.ChatMessage;
import com.campusmaster.campusmaster.entity.Role;
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
public class ChatMessageResponse {

    private Long id;
    private Long batchId;
    private Long senderId;
    private String senderName;
    private Role senderRole;
    private String content;

    @JsonProperty("isDeleted")
    private boolean isDeleted;

    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;

    @JsonProperty("isSelf")
    private boolean isSelf;

    public static ChatMessageResponse fromEntity(ChatMessage msg, Long currentUserId) {
        if (msg == null) return null;
        boolean self = currentUserId != null && msg.getSender() != null && currentUserId.equals(msg.getSender().getId());
        return ChatMessageResponse.builder()
                .id(msg.getId())
                .batchId(msg.getBatch() != null ? msg.getBatch().getId() : null)
                .senderId(msg.getSender() != null ? msg.getSender().getId() : null)
                .senderName(msg.getSender() != null ? msg.getSender().getName() : "Unknown")
                .senderRole(msg.getSender() != null ? msg.getSender().getRole() : Role.STUDENT)
                .content(msg.isDeleted() ? "This message was deleted" : msg.getContent())
                .isDeleted(msg.isDeleted())
                .createdAt(msg.getCreatedAt())
                .deletedAt(msg.getDeletedAt())
                .isSelf(self)
                .build();
    }
}
