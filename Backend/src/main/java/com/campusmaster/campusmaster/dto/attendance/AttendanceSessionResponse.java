package com.campusmaster.campusmaster.dto.attendance;

import com.campusmaster.campusmaster.entity.AttendanceSession;
import com.campusmaster.campusmaster.entity.AttendanceSessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSessionResponse {

    private Long id;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Long createdById;
    private String createdByName;
    private String title;
    private String sessionCode;
    private AttendanceSessionStatus status;
    private String currentQrToken;
    private LocalDateTime tokenGeneratedAt;
    private int durationMinutes;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime endedAt;
    private long attendeesCount;
    private boolean isExpired;

    public static AttendanceSessionResponse fromEntity(AttendanceSession session, long attendeesCount) {
        boolean expired = session.isExpired();
        AttendanceSessionStatus effectiveStatus = session.getStatus();
        if (effectiveStatus == AttendanceSessionStatus.ACTIVE && expired) {
            effectiveStatus = AttendanceSessionStatus.EXPIRED;
        }

        return AttendanceSessionResponse.builder()
            .id(session.getId())
            .courseId(session.getCourse().getId())
            .courseCode(session.getCourse().getCode())
            .courseName(session.getCourse().getName())
            .createdById(session.getCreatedBy().getId())
            .createdByName(session.getCreatedBy().getName())
            .title(session.getTitle())
            .sessionCode(session.getSessionCode())
            .status(effectiveStatus)
            .currentQrToken(session.getCurrentQrToken())
            .tokenGeneratedAt(session.getTokenGeneratedAt())
            .durationMinutes(session.getDurationMinutes())
            .expiresAt(session.getExpiresAt())
            .createdAt(session.getCreatedAt())
            .endedAt(session.getEndedAt())
            .attendeesCount(attendeesCount)
            .isExpired(expired)
            .build();
    }
}
