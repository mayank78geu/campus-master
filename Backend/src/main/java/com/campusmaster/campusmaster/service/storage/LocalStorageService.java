package com.campusmaster.campusmaster.service.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
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

    public LocalStorageService() {
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subfolder) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("Filename contains invalid path sequence: " + originalFilename);
        }

        // Generate unique filename to avoid collision while retaining original extension
        String extension = "";
        int i = originalFilename.lastIndexOf('.');
        if (i > 0) {
            extension = originalFilename.substring(i);
        }

        String uniqueFileName = UUID.randomUUID().toString() + extension;

        try {
            Path targetDirectory = this.rootLocation;
            if (subfolder != null && !subfolder.trim().isEmpty()) {
                targetDirectory = this.rootLocation.resolve(subfolder);
                Files.createDirectories(targetDirectory);
            }

            Path targetLocation = targetDirectory.resolve(uniqueFileName);
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
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new IllegalArgumentException("File not found: " + fileUrl);
            }
        } catch (MalformedURLException ex) {
            throw new IllegalArgumentException("File not found: " + fileUrl, ex);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            Path filePath = this.rootLocation.resolve(fileUrl).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log and ignore
        }
    }
}
