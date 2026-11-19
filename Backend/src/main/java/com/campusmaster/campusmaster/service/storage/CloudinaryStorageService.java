package com.campusmaster.campusmaster.service.storage;

import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.util.FileUploadValidator;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "campusmaster.storage.provider", havingValue = "cloudinary")
public class CloudinaryStorageService implements StorageService {

    private final Cloudinary cloudinary;

    public CloudinaryStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public String storeFile(MultipartFile file, String subfolder) {
        FileUploadValidator.validateSingleFile(file);

        String folder = (subfolder != null && !subfolder.trim().isEmpty())
            ? "campusmaster/" + subfolder.trim()
            : "campusmaster";

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "auto",
                    "use_filename", true,
                    "unique_filename", true
                )
            );

            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Cloudinary: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileUrl) {
        try {
            Resource resource = new UrlResource(fileUrl);
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Could not read file from Cloudinary URL: " + fileUrl);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Malformed Cloudinary file URL: " + fileUrl);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl != null && fileUrl.contains("/campusmaster/")) {
                int startIndex = fileUrl.indexOf("campusmaster/");
                int endIndex = fileUrl.lastIndexOf('.');
                if (startIndex != -1) {
                    String publicId = (endIndex > startIndex)
                        ? fileUrl.substring(startIndex, endIndex)
                        : fileUrl.substring(startIndex);

                    // Check extension to decide resource_type
                    String ext = (endIndex > 0) ? fileUrl.substring(endIndex + 1).toLowerCase() : "";
                    boolean isRaw = !ext.matches("png|jpg|jpeg|gif|webp|bmp|tiff");
                    String resourceType = isRaw ? "raw" : "image";

                    cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
                }
            }
        } catch (Exception ignored) {
            // Best effort deletion
        }
    }

    @Override
    public String getDownloadUrl(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return null;
        }
        if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
            return storedPath;
        }
        return cloudinary.url().signed(true).generate(storedPath);
    }
}
