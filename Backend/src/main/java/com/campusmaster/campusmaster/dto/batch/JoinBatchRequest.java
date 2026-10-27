package com.campusmaster.campusmaster.dto.batch;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinBatchRequest {

    @NotBlank(message = "Join code is required")
    private String joinCode;
}
