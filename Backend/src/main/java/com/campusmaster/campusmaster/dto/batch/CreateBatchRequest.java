package com.campusmaster.campusmaster.dto.batch;

import com.campusmaster.campusmaster.entity.JoinMode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateBatchRequest {

    @NotBlank(message = "Batch name is required (e.g. MCA 2026-28 Batch A)")
    private String name;

    private String term;

    private LocalDate startDate;

    private LocalDate endDate;

    private JoinMode joinMode = JoinMode.AUTO_APPROVE;
}
