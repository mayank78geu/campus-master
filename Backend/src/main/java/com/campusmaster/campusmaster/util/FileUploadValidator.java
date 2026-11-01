package com.campusmaster.campusmaster.util;

import com.campusmaster.campusmaster.exception.BadRequestException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Set;

public class FileUploadValidator {

    public static final long MAX_FILE_SIZE_BYTES = 25L * 1024 * 1024; // 25 MB
    public static final int MAX_FILES_PER_SUBMISSION = 10;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        "pdf", "docx", "pptx", "xlsx", "txt", "md", "zip", "png", "jpg", "jpeg", "gif", "webp"
    );

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/markdown",
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp"
    );

    public static void validateSingleFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new MaxUploadSizeExceededException(MAX_FILE_SIZE_BYTES);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new BadRequestException("Filename cannot be empty");
        }

        if (originalFilename.contains("..") || originalFilename.contains("/") || originalFilename.contains("\\")) {
            throw new BadRequestException("Invalid filename: " + originalFilename);
        }

        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex == originalFilename.length() - 1) {
            throw new BadRequestException("Files must have a valid file extension: " + originalFilename);
        }

        String extension = originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File type not allowed: ." + extension);
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            String lowerContentType = contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
            if (!ALLOWED_MIME_TYPES.contains(lowerContentType)) {
                throw new BadRequestException("MIME type not allowed: " + contentType);
            }
        }
    }

    public static void validateSubmissionFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return;
        }

        if (files.size() > MAX_FILES_PER_SUBMISSION) {
            throw new BadRequestException("Maximum " + MAX_FILES_PER_SUBMISSION + " files allowed per submission");
        }

        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                validateSingleFile(file);
            }
        }
    }

    public static String sanitizeFilename(String filename) {
        if (filename == null) return "file";
        // Remove path traversal and directory separators
        String cleaned = filename.replace("\\", "/");
        int lastSlash = cleaned.lastIndexOf('/');
        if (lastSlash >= 0) {
            cleaned = cleaned.substring(lastSlash + 1);
        }
        return cleaned.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
