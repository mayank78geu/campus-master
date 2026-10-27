package com.campusmaster.campusmaster.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String storeFile(MultipartFile file, String subfolder);
    Resource loadFileAsResource(String fileUrl);
    void deleteFile(String fileUrl);
}
