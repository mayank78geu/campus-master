package com.campusmaster.campusmaster.dto.batch;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.BatchStatus;
import com.campusmaster.campusmaster.entity.JoinMode;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private int activeAssignmentsCount;
    private LocalDateTime createdAt;

    @JsonProperty("enrolledCount")
    public int getEnrolledCount() {
        return enrolledStudentsCount;
    }

    @JsonProperty("activeStudentCount")
    public int getActiveStudentCount() {
        return enrolledStudentsCount;
    }

    public static BatchResponse fromEntity(Batch batch, int activeStudents, int activeAssignments) {
        return BatchResponse.builder()
            .id(batch.getId())
            .courseId(batch.getCourse() != null ? batch.getCourse().getId() : null)
            .courseName(batch.getCourse() != null ? batch.getCourse().getName() : null)
            .courseCode(batch.getCourse() != null ? batch.getCourse().getCode() : null)
            .name(batch.getName())
            .term(batch.getTerm())
            .startDate(batch.getStartDate())
            .endDate(batch.getEndDate())
            .joinCode(batch.getJoinCode())
            .joinMode(batch.getJoinMode())
            .status(batch.getStatus())
            .enrolledStudentsCount(activeStudents)
            .activeAssignmentsCount(activeAssignments)
            .createdAt(batch.getCreatedAt())
            .build();
    }

    public static BatchResponse fromEntity(Batch batch) {
        int activeAssignments = 0;
        try {
            if (batch.getAssignments() != null) {
                LocalDateTime now = LocalDateTime.now();
                activeAssignments = (int) batch.getAssignments().stream()
                        .filter(a -> a.getDueDate() == null || a.getDueDate().isAfter(now))
                        .count();
            }
        } catch (Exception e) {
            activeAssignments = 0;
        }

        int activeStudents = 0;
        try {
            if (batch.getEnrollments() != null) {
                activeStudents = (int) batch.getEnrollments().stream()
                        .filter(e -> e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus().name()))
                        .count();
            }
        } catch (Exception e) {
            activeStudents = 0;
        }

        return fromEntity(batch, activeStudents, activeAssignments);
    }
}
