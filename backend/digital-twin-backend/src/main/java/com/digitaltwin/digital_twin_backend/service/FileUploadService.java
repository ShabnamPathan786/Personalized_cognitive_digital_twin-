package com.digitaltwin.digital_twin_backend.service;


import com.digitaltwin.digital_twin_backend.model.FileUpload;
import com.digitaltwin.digital_twin_backend.repository.FileUploadRepository;
import com.mongodb.client.gridfs.model.GridFSFile;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;

/**
 * File Upload Service
 * Handles file uploads (PDF, images, audio, video) and storage in MongoDB GridFS
 */
@Service
@RequiredArgsConstructor
public class FileUploadService {

    private final FileUploadRepository fileUploadRepository;
    private final GridFsTemplate gridFsTemplate;
    private final Tika tika = new Tika();

    /**
     * Upload file to GridFS and save metadata
     */
    public FileUpload uploadFile(MultipartFile file, String userId, String description) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Detect file type
        String contentType = tika.detect(file.getBytes());
        FileUpload.FileCategory category = determineFileCategory(contentType);

        // Store file in GridFS
        InputStream inputStream = file.getInputStream();
        org.bson.types.ObjectId gridFsFileId = gridFsTemplate.store(
                inputStream,
                file.getOriginalFilename(),
                contentType
        );

        // Create file metadata
        FileUpload fileUpload = new FileUpload();
        fileUpload.setUserId(userId);
        fileUpload.setFileName(generateUniqueFileName(file.getOriginalFilename()));
        fileUpload.setOriginalFileName(file.getOriginalFilename());
        fileUpload.setFileType(contentType);
        fileUpload.setFileSize(file.getSize());
        fileUpload.setCategory(category);
        fileUpload.setGridFsFileId(gridFsFileId.toString());
        fileUpload.setDescription(description);
        fileUpload.setUploadedAt(LocalDateTime.now());
        fileUpload.setProcessed(false);

        // Save metadata to MongoDB
        return fileUploadRepository.save(fileUpload);
    }

    /**
     * Get file by ID
     */
    public FileUpload getFileById(String fileId) {
        return fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    /**
     * Get all files for a user
     */
    public List<FileUpload> getUserFiles(String userId) {
        return fileUploadRepository.findByUserId(userId);
    }

    /**
     * Get files by category
     */
    public List<FileUpload> getUserFilesByCategory(String userId, FileUpload.FileCategory category) {
        return fileUploadRepository.findByUserIdAndCategory(userId, category);
    }

    /**
     * Download file from GridFS
     */
    public GridFSFile downloadFile(String gridFsFileId) {
        Query query = new Query(Criteria.where("_id").is(gridFsFileId));
        return gridFsTemplate.findOne(query);
    }

    /**
     * Delete file
     */
    public void deleteFile(String fileId) {
        FileUpload fileUpload = getFileById(fileId);

        // Delete from GridFS
        Query query = new Query(Criteria.where("_id").is(fileUpload.getGridFsFileId()));
        gridFsTemplate.delete(query);

        // Delete metadata
        fileUploadRepository.deleteById(fileId);
    }

    /**
     * Determine file category from MIME type
     */
    private FileUpload.FileCategory determineFileCategory(String contentType) {
        if (contentType.startsWith("image/")) {
            return FileUpload.FileCategory.IMAGE;
        } else if (contentType.startsWith("audio/")) {
            return FileUpload.FileCategory.AUDIO;
        } else if (contentType.startsWith("video/")) {
            return FileUpload.FileCategory.VIDEO;
        } else if (contentType.equals("application/pdf")) {
            return FileUpload.FileCategory.PDF;
        } else if (contentType.contains("document") || contentType.contains("text")) {
            return FileUpload.FileCategory.DOCUMENT;
        }
        return FileUpload.FileCategory.OTHER;
    }

    /**
     * Generate unique filename
     */
    private String generateUniqueFileName(String originalFileName) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        return timestamp + "_" + originalFileName;
    }

    /**
     * Mark file as processed
     */
    public void markAsProcessed(String fileId, String extractedText, String summary) {
        FileUpload fileUpload = getFileById(fileId);
        fileUpload.setProcessed(true);
        fileUpload.setProcessedAt(LocalDateTime.now());
        fileUpload.setExtractedText(extractedText);
        fileUpload.setSummary(summary);
        fileUploadRepository.save(fileUpload);
    }
}
