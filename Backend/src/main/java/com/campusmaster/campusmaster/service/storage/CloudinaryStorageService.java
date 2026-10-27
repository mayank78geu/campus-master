package com.campusmaster.campusmaster.service.storage;

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
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "campusmaster/" + subfolder,
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
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file from Cloudinary URL: " + fileUrl);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed Cloudinary file URL: " + fileUrl, e);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            // Extract public_id from Cloudinary URL
            if (fileUrl != null && fileUrl.contains("/campusmaster/")) {
                int startIndex = fileUrl.indexOf("campusmaster/");
                int endIndex = fileUrl.lastIndexOf('.');
                if (startIndex != -1 && endIndex > startIndex) {
                    String publicId = fileUrl.substring(startIndex, endIndex);
                    cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                }
            }
        } catch (Exception ignored) {
            // Best effort deletion
        }
    }
}
