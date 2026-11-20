package com.campusmaster.campusmaster.dto.auth;

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
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private boolean isVerified;
    private String studentId;
    private String course;
    private String section;
    private String classRollNo;
    private String phoneNumber;
    private boolean isProfileCompleted;
    private LocalDateTime createdAt;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole())
            .isVerified(user.isVerified())
            .studentId(user.getStudentId())
            .course(user.getCourse())
            .section(user.getSection())
            .classRollNo(user.getClassRollNo())
            .phoneNumber(user.getPhoneNumber())
            .isProfileCompleted(user.getRole() == Role.FACULTY || user.isProfileCompleted())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
