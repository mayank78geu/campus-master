package com.campusmaster.campusmaster.dto.resource;

import com.campusmaster.campusmaster.entity.Resource;
import com.campusmaster.campusmaster.entity.ResourceType;
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
public class ResourceResponse {
    private Long id;
    private Long courseId;
    private String courseName;
    private Long unitId;
    private String unitTitle;
    private String title;
    private String description;
    private ResourceType resourceType;
    private String fileUrl;
    private String externalUrl;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private boolean isPublished;
    private int currentVersion;
    private int viewCount;
    private int downloadCount;
    private String createdByName;
    private List<ResourceVersionResponse> versions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ResourceResponse fromEntity(Resource r) {
        return ResourceResponse.builder()
            .id(r.getId())
            .courseId(r.getCourse().getId())
            .courseName(r.getCourse().getName())
            .unitId(r.getUnit() != null ? r.getUnit().getId() : null)
            .unitTitle(r.getUnit() != null ? r.getUnit().getTitle() : null)
            .title(r.getTitle())
            .description(r.getDescription())
            .resourceType(r.getResourceType())
            .fileUrl(r.getFileUrl())
            .externalUrl(r.getExternalUrl())
            .fileName(r.getFileName())
            .fileSize(r.getFileSize())
            .mimeType(r.getMimeType())
            .isPublished(r.isPublished())
            .currentVersion(r.getCurrentVersion())
            .viewCount(r.getViewCount())
            .downloadCount(r.getDownloadCount())
            .createdByName(r.getCreatedBy() != null ? r.getCreatedBy().getName() : null)
            .versions(r.getVersions() != null ? 
                r.getVersions().stream().map(ResourceVersionResponse::fromEntity).collect(Collectors.toList()) : List.of())
            .createdAt(r.getCreatedAt())
            .updatedAt(r.getUpdatedAt())
            .build();
    }
}
