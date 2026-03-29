package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.model.FileUpload;
import com.digitaltwin.digital_twin_backend.model.Note;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.FileUploadService;
import com.digitaltwin.digital_twin_backend.service.SummarizationService;
import com.digitaltwin.digital_twin_backend.service.NoteService;
import com.mongodb.client.gridfs.model.GridFSFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.io.InputStream;
import java.util.*;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final SummarizationService summarizationService;
    private final NoteService noteService;
    private final GridFsTemplate gridFsTemplate;

    /**
     * Helper method to get current user ID from authentication
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            return userDetails.getId();
        }
        throw new RuntimeException("User not authenticated");
    }

    /**
     * Helper method to get current user details
     */
    private CustomUserDetails getCurrentUserDetails() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails) {
            return (CustomUserDetails) authentication.getPrincipal();
        }
        throw new RuntimeException("User not authenticated");
    }

    // ==================== FILE UPLOAD ====================

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        try {
            String userId = getCurrentUserId();
            FileUpload uploadedFile = fileUploadService.uploadFile(file, userId, description);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "File uploaded successfully",
                    "data", uploadedFile
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to upload file: " + e.getMessage()
            ));
        }
    }

    // ==================== FILE RETRIEVAL ====================

    @GetMapping
    public ResponseEntity<?> getAllFiles() {
        try {
            String userId = getCurrentUserId();
            List<FileUpload> files = fileUploadService.getUserFiles(userId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", files
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getFilesByCategory(@PathVariable String category) {
        try {
            String userId = getCurrentUserId();
            FileUpload.FileCategory fileCategory = FileUpload.FileCategory.valueOf(category.toUpperCase());
            List<FileUpload> files = fileUploadService.getUserFilesByCategory(userId, fileCategory);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", files
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<?> getFileById(@PathVariable String fileId) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", file
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ==================== FILE DOWNLOAD ====================

    @GetMapping("/{fileId}/download")
    public ResponseEntity<?> downloadFile(@PathVariable String fileId) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).build();
            }

            GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
            if (gridFsFile == null) {
                return ResponseEntity.notFound().build();
            }

            InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getOriginalFileName() + "\"")
                    .contentType(MediaType.parseMediaType(file.getFileType()))
                    .body(inputStream.readAllBytes());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ==================== FILE DELETION ====================

    @DeleteMapping("/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable String fileId) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }

            fileUploadService.deleteFile(fileId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "File deleted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ==================== PDF SUMMARIZATION ====================

    @PostMapping("/summarize/pdf/{fileId}")
    public ResponseEntity<?> summarizePDF(
            @PathVariable String fileId,
            @RequestParam(defaultValue = "standard") String mode,
            @RequestParam(defaultValue = "true") boolean saveAsNote) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }

            if (file.getCategory() != FileUpload.FileCategory.PDF) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "File is not a PDF"
                ));
            }

            // Get file from GridFS
            GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
            InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();

            // Extract text from PDF
            String extractedText = summarizationService.extractTextFromPDF(inputStream);

            // Generate summary
            String summary = mode.equalsIgnoreCase("dementia")
                    ? summarizationService.summarizeForDementiaPatient(extractedText)
                    : summarizationService.summarizeText(extractedText);

            // Mark file as processed
            fileUploadService.markAsProcessed(fileId, extractedText, summary);

            // Save as note if requested using the dedicated createSummaryNote method
            if (saveAsNote) {
                noteService.createSummaryNote(
                        userId,
                        "PDF Summary: " + file.getOriginalFileName(),
                        summary,
                        fileId,
                        file.getOriginalFileName()
                );
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "PDF summarized successfully",
                    "data", summary
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to summarize PDF: " + e.getMessage()
            ));
        }
    }

    // ==================== AUDIO/VIDEO SUMMARIZATION ====================

    @PostMapping("/summarize/audio/{fileId}")
    public ResponseEntity<?> summarizeAudio(
            @PathVariable String fileId,
            @RequestParam(defaultValue = "standard") String mode,
            @RequestParam(defaultValue = "true") boolean saveAsNote,
            @RequestParam(defaultValue = "true") boolean saveTranscription) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }

            if (file.getCategory() != FileUpload.FileCategory.AUDIO &&
                    file.getCategory() != FileUpload.FileCategory.VIDEO) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "File is not an audio or video file"
                ));
            }

            // Get file from GridFS
            GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
            InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();

            // Transcribe and summarize
            boolean dementiaMode = mode.equalsIgnoreCase("dementia");
            SummarizationService.TranscriptionResult result =
                    summarizationService.transcribeAndSummarize(inputStream, file.getOriginalFileName(), dementiaMode);

            // Mark file as processed
            fileUploadService.markAsProcessed(fileId, result.getTranscription(), result.getSummary());

            // Save transcription as note if requested
            if (saveTranscription) {
                Note transcriptionNote = new Note();
                transcriptionNote.setUserId(userId);
                transcriptionNote.setTitle("Transcription: " + file.getOriginalFileName());
                transcriptionNote.setContent(result.getTranscription());
                transcriptionNote.setType(Note.NoteType.TEXT);
                transcriptionNote.setPriority(Note.NotePriority.MEDIUM);
                transcriptionNote.setSourceFileId(fileId);
                transcriptionNote.setSourceFileName(file.getOriginalFileName());
                transcriptionNote.setColor("#DBEAFE"); // Blue for transcriptions
                transcriptionNote.setCategory("Transcription");
                transcriptionNote.setPinned(false);
                transcriptionNote.setArchived(false);
                noteService.createNote(transcriptionNote);
            }

            // Save summary as note if requested using createSummaryNote
            if (saveAsNote) {
                noteService.createSummaryNote(
                        userId,
                        file.getCategory() + " Summary: " + file.getOriginalFileName(),
                        result.getSummary(),
                        fileId,
                        file.getOriginalFileName()
                );
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Audio/Video transcribed and summarized successfully",
                    "data", Map.of(
                            "transcription", result.getTranscription(),
                            "summary", result.getSummary()
                    )
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to process audio/video: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/summarize/video/{fileId}")
    public ResponseEntity<?> summarizeVideo(
            @PathVariable String fileId,
            @RequestParam(defaultValue = "standard") String mode,
            @RequestParam(defaultValue = "true") boolean saveAsNote,
            @RequestParam(defaultValue = "true") boolean saveTranscription) {
        // Video files are processed the same way as audio files (extract audio track)
        return summarizeAudio(fileId, mode, saveAsNote, saveTranscription);
    }

    // ==================== TEXT SUMMARIZATION ====================

    @PostMapping("/summarize/text")
    public ResponseEntity<?> summarizeText(@RequestBody Map<String, String> request) {
        try {
            String text = request.get("text");
            String mode = request.getOrDefault("mode", "standard");

            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Text is required"
                ));
            }

            String summary = mode.equalsIgnoreCase("dementia")
                    ? summarizationService.summarizeForDementiaPatient(text)
                    : summarizationService.summarizeText(text);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", summary
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to summarize text: " + e.getMessage()
            ));
        }
    }

    // ==================== BATCH SUMMARIZATION ====================

    @PostMapping("/summarize/batch")
    public ResponseEntity<?> batchSummarize(@RequestBody Map<String, Object> request) {
        try {
            String userId = getCurrentUserId();

            @SuppressWarnings("unchecked")
            List<String> fileIds = (List<String>) request.get("fileIds");
            String mode = (String) request.getOrDefault("mode", "standard");
            boolean saveAsNote = (boolean) request.getOrDefault("saveAsNote", true);

            List<Map<String, Object>> results = new ArrayList<>();
            List<String> errors = new ArrayList<>();

            for (String fileId : fileIds) {
                try {
                    FileUpload file = fileUploadService.getFileById(fileId);
                    if (!file.getUserId().equals(userId)) {
                        errors.add("Access denied for file: " + fileId);
                        continue;
                    }

                    // Process based on file type
                    String summary = null;
                    String extractedText = null;

                    if (file.getCategory() == FileUpload.FileCategory.PDF) {
                        // Process PDF
                        GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
                        InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();
                        extractedText = summarizationService.extractTextFromPDF(inputStream);
                        summary = mode.equalsIgnoreCase("dementia")
                                ? summarizationService.summarizeForDementiaPatient(extractedText)
                                : summarizationService.summarizeText(extractedText);
                        fileUploadService.markAsProcessed(fileId, extractedText, summary);
                    } else if (file.getCategory() == FileUpload.FileCategory.AUDIO ||
                            file.getCategory() == FileUpload.FileCategory.VIDEO) {
                        // Process Audio/Video
                        GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
                        InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();
                        boolean dementiaMode = mode.equalsIgnoreCase("dementia");
                        SummarizationService.TranscriptionResult result =
                                summarizationService.transcribeAndSummarize(inputStream, file.getOriginalFileName(), dementiaMode);
                        summary = result.getSummary();
                        extractedText = result.getTranscription();
                        fileUploadService.markAsProcessed(fileId, result.getTranscription(), result.getSummary());
                    }

                    // Save summary as note using createSummaryNote
                    if (summary != null && saveAsNote) {
                        noteService.createSummaryNote(
                                userId,
                                file.getCategory() + " Summary: " + file.getOriginalFileName(),
                                summary,
                                fileId,
                                file.getOriginalFileName()
                        );
                    }

                    results.add(Map.of(
                            "fileId", fileId,
                            "fileName", file.getOriginalFileName(),
                            "success", true,
                            "summary", summary != null ? summary : "Could not process this file type"
                    ));
                } catch (Exception e) {
                    errors.add("Failed to process " + fileId + ": " + e.getMessage());
                    results.add(Map.of(
                            "fileId", fileId,
                            "success", false,
                            "error", e.getMessage()
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "results", results,
                    "errors", errors
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Batch processing failed: " + e.getMessage()
            ));
        }
    }

    // ==================== GET CACHED SUMMARY ====================

    @GetMapping("/summarize/file/{fileId}")
    public ResponseEntity<?> getCachedSummary(@PathVariable String fileId) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }

            if (!file.isProcessed() || file.getSummary() == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "No summary available for this file"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "summary", file.getSummary(),
                            "transcription", file.getExtractedText(),
                            "processedAt", file.getProcessedAt()
                    )
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ==================== REGENERATE SUMMARY ====================

    @PostMapping("/summarize/regenerate/{fileId}")
    public ResponseEntity<?> regenerateSummary(
            @PathVariable String fileId,
            @RequestParam(defaultValue = "standard") String mode,
            @RequestParam(defaultValue = "false") boolean saveAsNote) {
        try {
            String userId = getCurrentUserId();
            FileUpload file = fileUploadService.getFileById(fileId);
            if (!file.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied"
                ));
            }

            String summary;
            String extractedText = file.getExtractedText();

            // If no extracted text, need to re-extract
            if (extractedText == null || extractedText.isEmpty()) {
                GridFSFile gridFsFile = fileUploadService.downloadFile(file.getGridFsFileId());
                InputStream inputStream = gridFsTemplate.getResource(gridFsFile).getInputStream();

                if (file.getCategory() == FileUpload.FileCategory.PDF) {
                    extractedText = summarizationService.extractTextFromPDF(inputStream);
                } else if (file.getCategory() == FileUpload.FileCategory.AUDIO ||
                        file.getCategory() == FileUpload.FileCategory.VIDEO) {
                    extractedText = summarizationService.transcribeAudio(inputStream, file.getOriginalFileName());
                }
            }

            // Generate new summary
            summary = mode.equalsIgnoreCase("dementia")
                    ? summarizationService.summarizeForDementiaPatient(extractedText)
                    : summarizationService.summarizeText(extractedText);

            // Update file
            fileUploadService.markAsProcessed(fileId, extractedText, summary);

            // Save as note using createSummaryNote
            if (saveAsNote) {
                noteService.createSummaryNote(
                        userId,
                        file.getCategory() + " Summary (Regenerated): " + file.getOriginalFileName(),
                        summary,
                        fileId,
                        file.getOriginalFileName()
                );
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Summary regenerated successfully",
                    "data", summary
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to regenerate summary: " + e.getMessage()
            ));
        }
    }
}