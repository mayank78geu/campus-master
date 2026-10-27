package com.campusmaster.campusmaster.dto.batch;

import com.campusmaster.campusmaster.entity.Enrollment;
import com.campusmaster.campusmaster.entity.EnrollmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private Long batchId;
    private String batchName;
    private String courseName;
    private EnrollmentStatus status;
    private LocalDateTime joinedAt;

    public static EnrollmentResponse fromEntity(Enrollment enrollment) {
        return EnrollmentResponse.builder()
            .id(enrollment.getId())
            .studentId(enrollment.getStudent().getId())
            .studentName(enrollment.getStudent().getName())
            .studentEmail(enrollment.getStudent().getEmail())
            .batchId(enrollment.getBatch().getId())
            .batchName(enrollment.getBatch().getName())
            .courseName(enrollment.getBatch().getCourse().getName())
            .status(enrollment.getStatus())
            .joinedAt(enrollment.getJoinedAt())
            .build();
    }
}
