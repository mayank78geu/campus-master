package com.campusmaster.campusmaster.dto.assignment;

import com.campusmaster.campusmaster.entity.LatePolicy;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AssignmentResponse {
    private Long id;
    private Long batchId;
    private String batchName;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private String title;
    private String instructions;
    private LocalDateTime dueDate;
    private Integer maxMarks;
    private LatePolicy latePolicy;
    private String createdByName;
    private LocalDateTime createdAt;
    private List<AttachmentDto> attachments;
    private Long submissionCount;
    private Long totalStudents;
    private SubmissionResponse mySubmission;

    @Data
    @Builder
    public static class AttachmentDto {
        private Long id;
        private String fileName;
        private String fileUrl;
        private Long fileSize;
    }
}
