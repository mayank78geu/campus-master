package com.campusmaster.campusmaster.dto.announcement;

import com.campusmaster.campusmaster.entity.AnnouncementPriority;
import com.campusmaster.campusmaster.entity.AnnouncementTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAnnouncementRequest {

    @NotBlank(message = "Announcement title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Announcement message is required")
    @Size(max = 4096, message = "Message cannot exceed 4096 characters")
    private String message;

    @NotNull(message = "Target type is required")
    private AnnouncementTargetType targetType;

    // Optional depending on targetType
    private Long courseId;
    private Long batchId;
    private List<Long> batchIds;

    @Builder.Default
    private AnnouncementPriority priority = AnnouncementPriority.NORMAL;
}
