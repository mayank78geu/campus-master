package com.campusmaster.campusmaster.dto.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrTokenResponse {

    private Long sessionId;
    private String sessionCode;
    private String qrToken;
    private LocalDateTime tokenGeneratedAt;
    private LocalDateTime expiresAt;
    @Builder.Default
    private int refreshIntervalSeconds = 5;
    private long attendeesCount;
}
