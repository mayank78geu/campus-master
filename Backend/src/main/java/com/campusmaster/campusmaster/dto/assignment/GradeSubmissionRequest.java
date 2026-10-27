package com.campusmaster.campusmaster.dto.assignment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GradeSubmissionRequest {

    @NotNull(message = "Marks are required")
    private Double marks;

    private String feedback;
}
