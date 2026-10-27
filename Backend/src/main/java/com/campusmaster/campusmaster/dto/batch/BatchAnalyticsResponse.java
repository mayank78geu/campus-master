package com.campusmaster.campusmaster.dto.batch;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BatchAnalyticsResponse {
    private Long batchId;
    private String batchName;
    private Long courseId;
    private String courseName;
    private long totalEnrolledStudents;
    private long activeStudents;
    private long pendingStudents;
    private long totalAssignments;
    private long totalSubmissions;
    private double submissionRate; // Percentage 0 - 100
    private long onTimeSubmissions;
    private long lateSubmissions;
    private long totalCourseResources;
    private long totalResourceViews;
}
