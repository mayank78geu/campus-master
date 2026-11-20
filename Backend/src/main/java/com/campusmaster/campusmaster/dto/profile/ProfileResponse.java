package com.campusmaster.campusmaster.dto.profile;

import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private String studentId;
    private String course;
    private String section;
    private String classRollNo;
    private String phoneNumber;
    private boolean isProfileCompleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProfileResponse fromEntity(User user) {
        return ProfileResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole())
            .studentId(user.getStudentId())
            .course(user.getCourse())
            .section(user.getSection())
            .classRollNo(user.getClassRollNo())
            .phoneNumber(user.getPhoneNumber())
            .isProfileCompleted(user.getRole() == Role.FACULTY || user.isProfileCompleted())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .build();
    }
}
