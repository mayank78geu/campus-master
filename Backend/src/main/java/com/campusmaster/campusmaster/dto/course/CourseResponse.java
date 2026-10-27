package com.campusmaster.campusmaster.dto.course;

import com.campusmaster.campusmaster.dto.auth.UserResponse;
import com.campusmaster.campusmaster.entity.Course;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {
    private Long id;
    private String name;
    private String code;
    private String program;
    private String semester;
    private String description;
    private boolean isArchived;
    private UserResponse owner;
    private List<UserResponse> coFaculty;
    private List<UnitResponse> units;
    private int batchesCount;
    private LocalDateTime createdAt;

    public static CourseResponse fromEntity(Course course) {
        return CourseResponse.builder()
            .id(course.getId())
            .name(course.getName())
            .code(course.getCode())
            .program(course.getProgram())
            .semester(course.getSemester())
            .description(course.getDescription())
            .isArchived(course.isArchived())
            .owner(UserResponse.fromEntity(course.getOwner()))
            .coFaculty(course.getCoFaculty().stream().map(UserResponse::fromEntity).collect(Collectors.toList()))
            .units(course.getUnits().stream().map(UnitResponse::fromEntity).collect(Collectors.toList()))
            .batchesCount(course.getBatches() != null ? course.getBatches().size() : 0)
            .createdAt(course.getCreatedAt())
            .build();
    }
}
