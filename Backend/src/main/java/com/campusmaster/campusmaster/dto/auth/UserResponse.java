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
    private LocalDateTime createdAt;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole())
            .isVerified(user.isVerified())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
