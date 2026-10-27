package com.campusmaster.campusmaster.dto.course;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class CreateCourseRequest {

    @NotBlank(message = "Course name is required")
    private String name;

    @NotBlank(message = "Course code is required")
    private String code;

    private String program;

    private String semester;

    private String description;

    private List<String> initialUnits;
}
