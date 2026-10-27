package com.campusmaster.campusmaster.dto.course;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UnitRequest {
    private Long id;
    @NotBlank(message = "Unit title is required")
    private String title;
    private int sortOrder;
}
