package com.campusmaster.campusmaster.dto.batch;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.BatchStatus;
import com.campusmaster.campusmaster.entity.JoinMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchResponse {
    private Long id;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private String name;
    private String term;
    private LocalDate startDate;
    private LocalDate endDate;
    private String joinCode;
    private JoinMode joinMode;
    private BatchStatus status;
    private int enrolledStudentsCount;
    private LocalDateTime createdAt;

    public static BatchResponse fromEntity(Batch batch) {
        return BatchResponse.builder()
            .id(batch.getId())
            .courseId(batch.getCourse().getId())
            .courseName(batch.getCourse().getName())
            .courseCode(batch.getCourse().getCode())
            .name(batch.getName())
            .term(batch.getTerm())
            .startDate(batch.getStartDate())
            .endDate(batch.getEndDate())
            .joinCode(batch.getJoinCode())
            .joinMode(batch.getJoinMode())
            .status(batch.getStatus())
            .enrolledStudentsCount(batch.getEnrollments() != null ? 
                (int) batch.getEnrollments().stream()
                    .filter(e -> e.getStatus().name().equals("ACTIVE"))
                    .count() : 0)
            .createdAt(batch.getCreatedAt())
            .build();
    }
}
