package com.campusmaster.campusmaster.dto.resource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateResourceRequest {
    private String title;
    private String description;
    private Long unitId;
    private String externalUrl;
    private Boolean isPublished;
}
