package com.campusmaster.campusmaster.dto.resource;

import com.campusmaster.campusmaster.entity.ResourceVersion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceVersionResponse {
    private Long id;
    private int versionNumber;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String changeNote;
    private String createdByName;
    private LocalDateTime createdAt;

    public static ResourceVersionResponse fromEntity(ResourceVersion v) {
        return ResourceVersionResponse.builder()
            .id(v.getId())
            .versionNumber(v.getVersionNumber())
            .fileUrl(v.getFileUrl())
            .fileName(v.getFileName())
            .fileSize(v.getFileSize())
            .changeNote(v.getChangeNote())
            .createdByName(v.getCreatedBy() != null ? v.getCreatedBy().getName() : null)
            .createdAt(v.getCreatedAt())
            .build();
    }
}
