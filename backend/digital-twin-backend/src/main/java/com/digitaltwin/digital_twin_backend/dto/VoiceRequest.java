package com.digitaltwin.digital_twin_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * Voice Request DTO
 * For REST-based voice processing (fallback option)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoiceRequest {

    // Option 1: Direct audio file upload
    private MultipartFile audioFile;

    // Option 2: Base64 encoded audio
    @Size(max = 10 * 1024 * 1024) // 10MB max
    private String audioBase64;

    // Audio metadata
    private String audioFormat;        // "webm", "wav", "mp3"
    private Integer audioDuration;      // in seconds, if known

    // User context
    @NotNull
    private String userId;

    // Processing options
    private String mode = "standard";    // "standard" or "dementia"
    private boolean requireTranscription = true;
    private boolean requireResponse = true;
    private boolean requireTTS = true;

    // Client info for optimization
    private String clientType;           // "web", "mobile", "tablet"
    private String networkType;          // "wifi", "4g", "5g"
    private Map<String, String> clientCapabilities; // supported formats

    // For follow-up questions (maintain context)
    private String previousInteractionId;
    private String sessionId;

    // Validation
    public boolean hasAudio() {
        return (audioFile != null && !audioFile.isEmpty()) ||
                (audioBase64 != null && !audioBase64.isEmpty());
    }

    public boolean isDementiaMode() {
        return "dementia".equalsIgnoreCase(mode);
    }
}