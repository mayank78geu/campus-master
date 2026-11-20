package com.campusmaster.campusmaster.dto.attendance;

import com.campusmaster.campusmaster.entity.AttendanceRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRecordResponse {

    private Long id;
    private Long sessionId;
    private Long studentId;
    private String studentName;
    private String courseName;
    private String section;
    private String classRollNo;
    private String studentIdCode;
    private LocalDateTime markedAt;

    public static AttendanceRecordResponse fromEntity(AttendanceRecord record) {
        return AttendanceRecordResponse.builder()
            .id(record.getId())
            .sessionId(record.getSession().getId())
            .studentId(record.getStudent().getId())
            .studentName(record.getStudentName())
            .courseName(record.getCourseName())
            .section(record.getSection())
            .classRollNo(record.getClassRollNo())
            .studentIdCode(record.getStudentIdCode())
            .markedAt(record.getMarkedAt())
            .build();
    }
}
