package com.digitaltwin.digital_twin_backend.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * File Upload Model
 * Stores metadata for uploaded files (PDF, images, audio, video)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "file_uploads")
public class FileUpload {

    @Id
    private String id;

    private String userId; // Owner of the file

    private String fileName;
    private String originalFileName;
    private String fileType; // MIME type (application/pdf, image/jpeg, audio/mp3, video/mp4)
    private long fileSize; // Size in bytes

    private FileCategory category; // PDF, IMAGE, AUDIO, VIDEO

    private String gridFsFileId; // GridFS file ID for large files
    private String fileUrl; // URL or path to access the file

    private String description;
    private String extractedText; // For PDFs and documents
    private String summary; // AI-generated summary

    private FileMetadata metadata; // Additional metadata

    @CreatedDate
    private LocalDateTime uploadedAt;

    private boolean processed = false; // Has the file been processed by AI?
    private LocalDateTime processedAt;

    public enum FileCategory {
        PDF,
        IMAGE,
        AUDIO,
        VIDEO,
        DOCUMENT,
        OTHER
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileMetadata {
        // Image metadata
        private Integer width;
        private Integer height;

        // Audio/Video metadata
        private Long duration; // in seconds
        private String codec;
        private Integer bitrate;

        // Document metadata
        private Integer pageCount;
        private String author;
        private String title;
    }
}
