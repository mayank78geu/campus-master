package com.campusmaster.campusmaster.dto.attendance;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkAttendanceRequest {

    @NotBlank(message = "QR Token is required")
    private String qrToken;

    @NotBlank(message = "Session Code is required")
    private String sessionCode;
}
