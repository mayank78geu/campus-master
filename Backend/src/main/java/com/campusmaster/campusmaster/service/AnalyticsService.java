package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.batch.BatchAnalyticsResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final BatchRepository batchRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ResourceRepository resourceRepository;

    @Transactional(readOnly = true)
    public BatchAnalyticsResponse getBatchAnalytics(Long batchId, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));

        validateFacultyOwnership(batch.getCourse(), faculty);

        List<Enrollment> enrollments = enrollmentRepository.findByBatchOrderByJoinedAtDesc(batch);
        long totalEnrolled = enrollments.size();
        long activeStudents = enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
        long pendingStudents = enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.PENDING).count();

        List<Assignment> assignments = assignmentRepository.findByBatchIdOrderByDueDateAsc(batchId);
        long totalAssignments = assignments.size();

        long totalSubmissions = 0;
        long onTimeSubmissions = 0;
        long lateSubmissions = 0;

        for (Assignment a : assignments) {
            long subs = submissionRepository.countByAssignmentId(a.getId());
            long late = submissionRepository.countByAssignmentIdAndIsLate(a.getId(), true);
            totalSubmissions += subs;
            lateSubmissions += late;
            onTimeSubmissions += (subs - late);
        }

        double expectedSubmissions = activeStudents * totalAssignments;
        double submissionRate = expectedSubmissions > 0 ? (totalSubmissions / expectedSubmissions) * 100.0 : 0.0;
        submissionRate = Math.min(100.0, Math.round(submissionRate * 10.0) / 10.0);

        List<Resource> resources = resourceRepository.findByCourseOrderByCreatedAtDesc(batch.getCourse());
        long totalCourseResources = resources.size();
        long totalResourceViews = resources.stream().mapToLong(Resource::getViewCount).sum();

        return BatchAnalyticsResponse.builder()
            .batchId(batch.getId())
            .batchName(batch.getName())
            .courseId(batch.getCourse().getId())
            .courseName(batch.getCourse().getName())
            .totalEnrolledStudents(totalEnrolled)
            .activeStudents(activeStudents)
            .pendingStudents(pendingStudents)
            .totalAssignments(totalAssignments)
            .totalSubmissions(totalSubmissions)
            .submissionRate(submissionRate)
            .onTimeSubmissions(onTimeSubmissions)
            .lateSubmissions(lateSubmissions)
            .totalCourseResources(totalCourseResources)
            .totalResourceViews(totalResourceViews)
            .build();
    }

    @Transactional(readOnly = true)
    public String generateGradesCsv(Long batchId, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));

        validateFacultyOwnership(batch.getCourse(), faculty);

        List<Enrollment> activeEnrollments = enrollmentRepository.findByBatchOrderByJoinedAtDesc(batch).stream()
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .collect(Collectors.toList());

        List<Assignment> assignments = assignmentRepository.findByBatchIdOrderByDueDateAsc(batchId);

        StringBuilder csv = new StringBuilder();
        // Header
        csv.append("Student Name,Email,Enrollment Status");
        for (Assignment a : assignments) {
            csv.append(",\"").append(a.getTitle().replace("\"", "\"\"")).append(" (Max ").append(a.getMaxMarks()).append(")\"");
        }
        csv.append(",Total Marks Obtained,Max Possible Marks\n");

        int maxPossibleTotal = assignments.stream().mapToInt(Assignment::getMaxMarks).sum();

        // Rows
        for (Enrollment e : activeEnrollments) {
            User student = e.getStudent();
            csv.append("\"").append(student.getName().replace("\"", "\"\"")).append("\",");
            csv.append("\"").append(student.getEmail().replace("\"", "\"\"")).append("\",");
            csv.append(e.getStatus().name());

            double studentTotal = 0;
            for (Assignment a : assignments) {
                csv.append(",");
                Optional<Submission> subOpt = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), student.getId());
                if (subOpt.isPresent()) {
                    Submission s = subOpt.get();
                    if (s.getMarks() != null) {
                        csv.append(s.getMarks());
                        studentTotal += s.getMarks();
                    } else {
                        csv.append("Submitted (Pending Grading)");
                    }
                } else {
                    csv.append("Not Submitted");
                }
            }
            csv.append(",").append(studentTotal).append(",").append(maxPossibleTotal).append("\n");
        }

        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String generateRosterCsv(Long batchId, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));

        validateFacultyOwnership(batch.getCourse(), faculty);

        List<Enrollment> enrollments = enrollmentRepository.findByBatchOrderByJoinedAtDesc(batch);

        StringBuilder csv = new StringBuilder();
        csv.append("ID,Student Name,Email,Role,Status,Joined At\n");

        for (Enrollment e : enrollments) {
            User s = e.getStudent();
            csv.append(s.getId()).append(",");
            csv.append("\"").append(s.getName().replace("\"", "\"\"")).append("\",");
            csv.append("\"").append(s.getEmail().replace("\"", "\"\"")).append("\",");
            csv.append(s.getRole().name()).append(",");
            csv.append(e.getStatus().name()).append(",");
            csv.append(e.getJoinedAt() != null ? e.getJoinedAt().toString() : "").append("\n");
        }

        return csv.toString();
    }

    private void validateFacultyOwnership(Course course, User faculty) {
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));
        if (!isOwner && !isCoFaculty) {
            throw new BadRequestException("You do not have permission to view analytics or export data for this batch");
        }
    }
}
