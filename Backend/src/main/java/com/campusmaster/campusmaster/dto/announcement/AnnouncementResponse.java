package com.campusmaster.campusmaster.dto.announcement;

import com.campusmaster.campusmaster.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementResponse {

    private Long id;
    private String title;
    private String message;
    private AnnouncementTargetType targetType;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Long batchId;
    private String batchName;
    private List<Long> targetBatchIds;
    private List<String> targetBatchNames;
    private String targetAudienceText;
    private AnnouncementPriority priority;
    private AnnouncementStatus status;
    private int recipientCount;
    private Long authorId;
    private String authorName;
    private String authorEmail;
    private LocalDateTime createdAt;
    private LocalDateTime revertedAt;

    public static AnnouncementResponse fromEntity(Announcement a) {
        List<Long> bIds = null;
        List<String> bNames = null;
        if (a.getTargetBatches() != null && !a.getTargetBatches().isEmpty()) {
            bIds = a.getTargetBatches().stream().map(Batch::getId).collect(Collectors.toList());
            bNames = a.getTargetBatches().stream().map(Batch::getName).collect(Collectors.toList());
        }

        return AnnouncementResponse.builder()
            .id(a.getId())
            .title(a.getTitle())
            .message(a.getMessage())
            .targetType(a.getTargetType())
            .courseId(a.getCourse() != null ? a.getCourse().getId() : null)
            .courseName(a.getCourse() != null ? a.getCourse().getName() : null)
            .courseCode(a.getCourse() != null ? a.getCourse().getCode() : null)
            .batchId(a.getBatch() != null ? a.getBatch().getId() : null)
            .batchName(a.getBatch() != null ? a.getBatch().getName() : null)
            .targetBatchIds(bIds)
            .targetBatchNames(bNames)
            .targetAudienceText(a.getTargetAudienceText())
            .priority(a.getPriority())
            .status(a.getStatus())
            .recipientCount(a.getRecipientCount())
            .authorId(a.getAuthor() != null ? a.getAuthor().getId() : null)
            .authorName(a.getAuthor() != null ? a.getAuthor().getName() : null)
            .authorEmail(a.getAuthor() != null ? a.getAuthor().getEmail() : null)
            .createdAt(a.getCreatedAt())
            .revertedAt(a.getRevertedAt())
            .build();
    }
}
