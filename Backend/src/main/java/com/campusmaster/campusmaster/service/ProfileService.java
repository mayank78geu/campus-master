package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.profile.ProfileResponse;
import com.campusmaster.campusmaster.dto.profile.UpdateProfileRequest;
import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(User user) {
        return ProfileResponse.fromEntity(user);
    }

    @Transactional
    public ProfileResponse updateProfile(User user, UpdateProfileRequest request) {
        String trimmedName = request.getName().trim();
        String trimmedStudentId = request.getStudentId().trim().toUpperCase();
        String trimmedCourse = request.getCourse().trim();
        String trimmedSection = request.getSection().trim().toUpperCase();
        String trimmedRollNo = request.getClassRollNo().trim();
        String trimmedPhone = request.getPhoneNumber().trim();

        // 1. Validate Student ID uniqueness among other students
        if (userRepository.existsByStudentIdIgnoreCaseAndIdNot(trimmedStudentId, user.getId())) {
            throw new BadRequestException("Student ID '" + trimmedStudentId + "' is already registered to another account.");
        }

        // 2. Validate Class Roll No uniqueness within the same course & section
        if (userRepository.existsByCourseIgnoreCaseAndSectionIgnoreCaseAndClassRollNoIgnoreCaseAndIdNot(
                trimmedCourse, trimmedSection, trimmedRollNo, user.getId())) {
            throw new BadRequestException("Class Roll No. '" + trimmedRollNo + "' is already registered in " + trimmedCourse + " - Section " + trimmedSection + ".");
        }

        user.setName(trimmedName);
        user.setStudentId(trimmedStudentId);
        user.setCourse(trimmedCourse);
        user.setSection(trimmedSection);
        user.setClassRollNo(trimmedRollNo);
        user.setPhoneNumber(trimmedPhone);
        user.setProfileCompleted(true);

        User saved = userRepository.save(user);
        return ProfileResponse.fromEntity(saved);
    }

    public void validateStudentProfileComplete(User user) {
        if (user.getRole() == Role.STUDENT && !user.isProfileCompleted()) {
            throw new BadRequestException("Please complete your student profile before accessing courses, coursework, or attendance.");
        }
    }
}
