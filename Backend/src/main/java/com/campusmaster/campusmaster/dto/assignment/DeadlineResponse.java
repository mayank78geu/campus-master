package com.campusmaster.campusmaster.dto.assignment;

import com.campusmaster.campusmaster.entity.LatePolicy;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DeadlineResponse {
    private Long assignmentId;
    private Long batchId;
    private String batchName;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private String title;
    private LocalDateTime dueDate;
    private Integer maxMarks;
    private LatePolicy latePolicy;
    private boolean submitted;
    private boolean isLate;
    private Double marks;
    private boolean marksPublished;
    private String receiptToken;
}
