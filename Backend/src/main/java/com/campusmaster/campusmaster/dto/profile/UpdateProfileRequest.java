package com.campusmaster.campusmaster.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Student ID is required")
    @Size(min = 2, max = 50, message = "Student ID must be between 2 and 50 characters")
    private String studentId;

    @NotBlank(message = "Course is required")
    @Size(min = 2, max = 150, message = "Course must be between 2 and 150 characters")
    private String course;

    @NotBlank(message = "Section is required")
    @Size(min = 1, max = 20, message = "Section must be between 1 and 20 characters")
    private String section;

    @NotBlank(message = "Class Roll No. is required")
    @Size(min = 1, max = 30, message = "Class Roll No. must be between 1 and 30 characters")
    private String classRollNo;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[+]?[0-9]{10,15}$", message = "Phone number must be valid with 10 to 15 digits (e.g. 9876543210 or +919876543210)")
    private String phoneNumber;
}
