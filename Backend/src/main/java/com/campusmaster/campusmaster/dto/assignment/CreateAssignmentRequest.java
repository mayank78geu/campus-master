package com.campusmaster.campusmaster.dto.assignment;

import com.campusmaster.campusmaster.entity.LatePolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateAssignmentRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String instructions;

    @NotNull(message = "Due date is required")
    private LocalDateTime dueDate;

    private Integer maxMarks = 100;

    private LatePolicy latePolicy = LatePolicy.BLOCK_AFTER_DEADLINE;

    private List<AttachmentDto> attachments;

    @Data
    public static class AttachmentDto {
        private String fileName;
        private String fileUrl;
        private Long fileSize;
    }
}
