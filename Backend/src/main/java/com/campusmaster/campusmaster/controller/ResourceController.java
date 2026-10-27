package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.dto.resource.ResourceResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;
    private final AuthService authService;

    @PostMapping("/courses/{courseId}/resources/upload")
    public ResponseEntity<ApiResponse<ResourceResponse>> uploadFile(
            @PathVariable Long courseId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "unitId", required = false) Long unitId,
            @RequestParam(value = "isPublished", defaultValue = "true") boolean isPublished,
            @RequestParam("file") MultipartFile file) {

        User currentUser = authService.getCurrentUser();
        ResourceResponse response = resourceService.addFileResource(
            courseId, unitId, title, description, file, isPublished, currentUser
        );
        return ResponseEntity.ok(ApiResponse.ok(response, "Resource uploaded successfully"));
    }

    @PostMapping("/courses/{courseId}/resources/url")
    public ResponseEntity<ApiResponse<ResourceResponse>> addUrl(
            @PathVariable Long courseId,
            @RequestBody Map<String, Object> payload) {

        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        String externalUrl = (String) payload.get("externalUrl");
        Long unitId = payload.get("unitId") != null ? Long.valueOf(payload.get("unitId").toString()) : null;
        boolean isPublished = payload.get("isPublished") != null ? (Boolean) payload.get("isPublished") : true;

        if (title == null || externalUrl == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Title and external URL are required"));
        }

        User currentUser = authService.getCurrentUser();
        ResourceResponse response = resourceService.addUrlResource(
            courseId, unitId, title, description, externalUrl, isPublished, currentUser
        );
        return ResponseEntity.ok(ApiResponse.ok(response, "Link added successfully"));
    }

    @PostMapping("/resources/{id}/versions")
    public ResponseEntity<ApiResponse<ResourceResponse>> uploadVersion(
            @PathVariable Long id,
            @RequestParam(value = "changeNote", required = false) String changeNote,
            @RequestParam("file") MultipartFile file) {

        User currentUser = authService.getCurrentUser();
        ResourceResponse response = resourceService.uploadNewVersion(id, file, changeNote, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "New version uploaded successfully"));
    }

    @GetMapping("/courses/{courseId}/resources")
    public ResponseEntity<ApiResponse<List<ResourceResponse>>> getResources(
            @PathVariable Long courseId,
            @RequestParam(value = "unitId", required = false) Long unitId) {

        User currentUser = authService.getCurrentUser();
        List<ResourceResponse> response = resourceService.getResources(courseId, unitId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/courses/{courseId}/resources/search")
    public ResponseEntity<ApiResponse<List<ResourceResponse>>> search(
            @PathVariable Long courseId,
            @RequestParam("q") String query) {

        User currentUser = authService.getCurrentUser();
        List<ResourceResponse> response = resourceService.search(courseId, query, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/resources/{id}/view")
    public ResponseEntity<ApiResponse<Void>> recordView(@PathVariable Long id) {
        resourceService.recordView(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/resources/{id}/download")
    public ResponseEntity<ApiResponse<Void>> recordDownload(@PathVariable Long id) {
        resourceService.recordDownload(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
