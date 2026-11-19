package com.campusmaster.campusmaster.service.storage;

import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.security.FileSignatureService;
import com.campusmaster.campusmaster.util.FileUploadValidator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Objects;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "campusmaster.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private final Path rootLocation = Paths.get("uploads").toAbsolutePath().normalize();
    private final FileSignatureService fileSignatureService;

    public LocalStorageService(FileSignatureService fileSignatureService) {
        this.fileSignatureService = fileSignatureService;
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subfolder) {
        FileUploadValidator.validateSingleFile(file);

        String originalFilename = Objects.requireNonNull(file.getOriginalFilename());
        String sanitizedName = FileUploadValidator.sanitizeFilename(originalFilename);

        String extension = "";
        int i = sanitizedName.lastIndexOf('.');
        if (i > 0) {
            extension = sanitizedName.substring(i);
        }

        String uniqueFileName = UUID.randomUUID().toString() + extension;

        try {
            Path targetDirectory = this.rootLocation;
            if (subfolder != null && !subfolder.trim().isEmpty()) {
                targetDirectory = this.rootLocation.resolve(subfolder).normalize();
                if (!targetDirectory.startsWith(this.rootLocation)) {
                    throw new AccessDeniedException("Invalid target folder traversal attempt");
                }
                Files.createDirectories(targetDirectory);
            }

            Path targetLocation = targetDirectory.resolve(uniqueFileName).normalize();
            if (!targetLocation.startsWith(this.rootLocation)) {
                throw new AccessDeniedException("Target path outside root location");
            }
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return (subfolder != null && !subfolder.isEmpty())
                ? subfolder + "/" + uniqueFileName
                : uniqueFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFilename + ". Please try again!", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileUrl) {
        try {
            Path filePath = this.rootLocation.resolve(fileUrl).normalize();
            if (!filePath.startsWith(this.rootLocation)) {
                throw new AccessDeniedException("Access denied: path traversal attempt");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found: " + fileUrl);
            }
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("File not found: " + fileUrl);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            Path filePath = this.rootLocation.resolve(fileUrl).normalize();
            if (filePath.startsWith(this.rootLocation)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            // Log and ignore
        }
    }

    @Override
    public String getDownloadUrl(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return null;
        }
        return fileSignatureService.generateSignedUrl(storedPath);
    }
}
