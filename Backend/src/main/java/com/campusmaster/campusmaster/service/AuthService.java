package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.auth.AuthResponse;
import com.campusmaster.campusmaster.dto.auth.LoginRequest;
import com.campusmaster.campusmaster.dto.auth.RegisterRequest;
import com.campusmaster.campusmaster.dto.auth.UserResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.exception.UnauthorizedException;
import com.campusmaster.campusmaster.repository.UserRepository;
import com.campusmaster.campusmaster.security.JwtUtils;
import com.campusmaster.campusmaster.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email is already registered: " + normalizedEmail);
        }

        User user = User.builder()
            .name(request.getName().trim())
            .email(normalizedEmail)
            .password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole())
            .isVerified(true) // Open sign-up per PRD AUTH-3
            .build();

        user = userRepository.save(user);

        UserDetailsImpl userPrincipal = UserDetailsImpl.build(user);
        String jwt = jwtUtils.generateToken(userPrincipal);

        return AuthResponse.builder()
            .token(jwt)
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole())
            .build();
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail().trim().toLowerCase(),
                request.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        String jwt = jwtUtils.generateToken(userPrincipal);

        return AuthResponse.builder()
            .token(jwt)
            .id(userPrincipal.getId())
            .name(userPrincipal.getName())
            .email(userPrincipal.getEmail())
            .role(userPrincipal.getRole())
            .build();
    }

    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userPrincipal)) {
            throw new UnauthorizedException("No authenticated user in context");
        }
        return userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userPrincipal.getId()));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile() {
        return UserResponse.fromEntity(getCurrentUser());
    }
}
