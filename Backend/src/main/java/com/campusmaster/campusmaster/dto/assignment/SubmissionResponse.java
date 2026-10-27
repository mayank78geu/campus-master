package com.campusmaster.campusmaster.dto.assignment;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SubmissionResponse {
    private Long id;
    private Long assignmentId;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private LocalDateTime submittedAt;
    private boolean isLate;
    private String textContent;
    private String receiptToken;
    private Double marks;
    private String feedback;
    private boolean marksPublished;
    private Integer version;
    private List<AttachmentDto> attachments;

    @Data
    @Builder
    public static class AttachmentDto {
        private Long id;
        private String fileName;
        private String fileUrl;
        private Long fileSize;
    }
}
