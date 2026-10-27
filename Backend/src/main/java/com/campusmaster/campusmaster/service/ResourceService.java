package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.resource.ResourceResponse;
import com.campusmaster.campusmaster.dto.resource.ResourceVersionResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.CourseRepository;
import com.campusmaster.campusmaster.repository.ResourceRepository;
import com.campusmaster.campusmaster.repository.ResourceVersionRepository;
import com.campusmaster.campusmaster.repository.UnitRepository;
import com.campusmaster.campusmaster.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceVersionRepository resourceVersionRepository;
    private final CourseRepository courseRepository;
    private final UnitRepository unitRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    private static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per PRD §5.4

    @Transactional
    public ResourceResponse addFileResource(
            Long courseId,
            Long unitId,
            String title,
            String description,
            MultipartFile file,
            boolean isPublished,
            User faculty
    ) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        validateFacultyOwnership(course, faculty);

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum allowed size of 25 MB");
        }

        Unit unit = null;
        if (unitId != null) {
            unit = unitRepository.findById(unitId).orElse(null);
        }

        String storedPath = storageService.storeFile(file, "courses/" + courseId);

        Resource resource = Resource.builder()
            .course(course)
            .unit(unit)
            .title(title.trim())
            .description(description)
            .resourceType(ResourceType.FILE)
            .fileUrl(storedPath)
            .fileName(file.getOriginalFilename())
            .fileSize(file.getSize())
            .mimeType(file.getContentType())
            .isPublished(isPublished)
            .currentVersion(1)
            .createdBy(faculty)
            .build();

        resource = resourceRepository.save(resource);

        // Record initial version
        ResourceVersion initialVersion = ResourceVersion.builder()
            .resource(resource)
            .versionNumber(1)
            .fileUrl(storedPath)
            .fileName(file.getOriginalFilename())
            .fileSize(file.getSize())
            .mimeType(file.getContentType())
            .changeNote("Initial release")
            .createdBy(faculty)
            .build();

        resourceVersionRepository.save(initialVersion);
        resource.getVersions().add(initialVersion);

        // Notify enrolled students in all active batches
        if (isPublished) {
            notificationService.notifyCourseStudents(
                course,
                "New Resource: " + resource.getTitle(),
                "New material was added to " + course.getName() + (unit != null ? " (" + unit.getTitle() + ")" : ""),
                "RESOURCE_ADDED",
                "/courses/" + courseId
            );
        }

        return ResourceResponse.fromEntity(resource);
    }

    @Transactional
    public ResourceResponse addUrlResource(
            Long courseId,
            Long unitId,
            String title,
            String description,
            String externalUrl,
            boolean isPublished,
            User faculty
    ) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        validateFacultyOwnership(course, faculty);

        Unit unit = null;
        if (unitId != null) {
            unit = unitRepository.findById(unitId).orElse(null);
        }

        Resource resource = Resource.builder()
            .course(course)
            .unit(unit)
            .title(title.trim())
            .description(description)
            .resourceType(ResourceType.URL)
            .externalUrl(externalUrl.trim())
            .isPublished(isPublished)
            .currentVersion(1)
            .createdBy(faculty)
            .build();

        resource = resourceRepository.save(resource);

        if (isPublished) {
            notificationService.notifyCourseStudents(
                course,
                "New Resource: " + resource.getTitle(),
                "A link was added to " + course.getName(),
                "RESOURCE_ADDED",
                "/courses/" + courseId
            );
        }

        return ResourceResponse.fromEntity(resource);
    }

    @Transactional
    public ResourceResponse uploadNewVersion(
            Long resourceId,
            MultipartFile file,
            String changeNote,
            User faculty
    ) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new IllegalArgumentException("Resource not found: " + resourceId));

        validateFacultyOwnership(resource.getCourse(), faculty);

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum allowed size of 25 MB");
        }

        int newVersionNumber = resource.getCurrentVersion() + 1;
        String storedPath = storageService.storeFile(file, "courses/" + resource.getCourse().getId());

        ResourceVersion newVersion = ResourceVersion.builder()
            .resource(resource)
            .versionNumber(newVersionNumber)
            .fileUrl(storedPath)
            .fileName(file.getOriginalFilename())
            .fileSize(file.getSize())
            .mimeType(file.getContentType())
            .changeNote(changeNote != null ? changeNote.trim() : "Version " + newVersionNumber)
            .createdBy(faculty)
            .build();

        resourceVersionRepository.save(newVersion);

        // Update active file on the resource
        resource.setCurrentVersion(newVersionNumber);
        resource.setFileUrl(storedPath);
        resource.setFileName(file.getOriginalFilename());
        resource.setFileSize(file.getSize());
        resource.setMimeType(file.getContentType());
        resource.getVersions().add(0, newVersion);

        notificationService.notifyCourseStudents(
            resource.getCourse(),
            "Resource Updated: " + resource.getTitle(),
            "A new version was uploaded for " + resource.getTitle(),
            "RESOURCE_UPDATED",
            "/courses/" + resource.getCourse().getId()
        );

        return ResourceResponse.fromEntity(resource);
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> getResources(Long courseId, Long unitId, User user) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        boolean isFaculty = user.getRole() == Role.FACULTY;

        List<Resource> list;
        if (unitId != null) {
            Unit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new IllegalArgumentException("Unit not found: " + unitId));
            list = isFaculty
                ? resourceRepository.findByCourseAndUnitOrderByCreatedAtDesc(course, unit)
                : resourceRepository.findByCourseAndUnitAndIsPublishedTrueOrderByCreatedAtDesc(course, unit);
        } else {
            list = isFaculty
                ? resourceRepository.findByCourseOrderByCreatedAtDesc(course)
                : resourceRepository.findByCourseAndIsPublishedTrueOrderByCreatedAtDesc(course);
        }

        return list.stream().map(ResourceResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public void recordView(Long resourceId) {
        resourceRepository.findById(resourceId).ifPresent(r -> r.setViewCount(r.getViewCount() + 1));
    }

    @Transactional
    public void recordDownload(Long resourceId) {
        resourceRepository.findById(resourceId).ifPresent(r -> r.setDownloadCount(r.getDownloadCount() + 1));
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> search(Long courseId, String query, User user) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        return resourceRepository.searchInCourse(course, query.trim()).stream()
            .filter(r -> user.getRole() == Role.FACULTY || r.isPublished())
            .map(ResourceResponse::fromEntity)
            .collect(Collectors.toList());
    }

    private void validateFacultyOwnership(Course course, User faculty) {
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));
        if (!isOwner && !isCoFaculty) {
            throw new AccessDeniedException("You do not have permission to manage resources for this course");
        }
    }
}
