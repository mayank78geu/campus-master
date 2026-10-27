package com.campusmaster.campusmaster.dto.assignment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CloneAssignmentRequest {

    @NotNull(message = "Target batch ID is required")
    private Long targetBatchId;

    @NotNull(message = "New due date is required")
    private LocalDateTime newDueDate;
}
