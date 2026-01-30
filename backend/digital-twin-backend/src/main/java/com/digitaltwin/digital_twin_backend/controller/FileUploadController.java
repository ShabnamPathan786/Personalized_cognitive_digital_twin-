package com.digitaltwin.digital_twin_backend.controller;


import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.FileUpload;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.FileUploadService;
import com.mongodb.client.gridfs.model.GridFSFile;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * File Upload Controller
 * REST API for file uploads (PDF, images, audio, video)
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final GridFsTemplate gridFsTemplate;

    /**
     * Upload a file
     * POST /api/files/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<FileUpload>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            FileUpload uploadedFile = fileUploadService.uploadFile(file, userDetails.getId(), description);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("File uploaded successfully", uploadedFile));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload file: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all files for current user
     * GET /api/files
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FileUpload>>> getUserFiles(Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<FileUpload> files = fileUploadService.getUserFiles(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Files retrieved successfully", files));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve files: " + e.getMessage()));
        }
    }

    /**
     * Get files by category
     * GET /api/files/category/{category}
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<FileUpload>>> getFilesByCategory(
            @PathVariable FileUpload.FileCategory category,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<FileUpload> files = fileUploadService.getUserFilesByCategory(userDetails.getId(), category);

            return ResponseEntity.ok(ApiResponse.success("Files retrieved successfully", files));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve files: " + e.getMessage()));
        }
    }

    /**
     * Get file by ID
     * GET /api/files/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FileUpload>> getFileById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            FileUpload file = fileUploadService.getFileById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check if user owns the file
            if (!file.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            return ResponseEntity.ok(ApiResponse.success("File retrieved successfully", file));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Download file
     * GET /api/files/{id}/download
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadFile(@PathVariable String id, Authentication authentication) {
        try {
            FileUpload file = fileUploadService.getFileById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check if user owns the file
            if (!file.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            GridFSFile gridFSFile = fileUploadService.downloadFile(file.getGridFsFileId());
            if (gridFSFile == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("File not found in storage"));
            }

            InputStreamResource resource = new InputStreamResource(gridFsTemplate.getResource(gridFSFile).getInputStream());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getOriginalFileName() + "\"")
                    .contentType(MediaType.parseMediaType(file.getFileType()))
                    .contentLength(file.getFileSize())
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to download file: " + e.getMessage()));
        }
    }

    /**
     * Delete file
     * DELETE /api/files/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(@PathVariable String id, Authentication authentication) {
        try {
            FileUpload file = fileUploadService.getFileById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check if user owns the file
            if (!file.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            fileUploadService.deleteFile(id);
            return ResponseEntity.ok(ApiResponse.success("File deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
