package com.digitaltwin.digital_twin_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Voice Response DTO
 * Sent back to client after voice processing
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceResponse {

    // Core response
    private String interactionId;
    private ResponseStatus status;

    // Transcription (always included)
    private String transcription;
    private float transcriptionConfidence;

    // Text response (if generated)
    private String textResponse;

    // Audio response (if TTS generated)
    private String audioUrl;
    private String audioFormat;
    private int audioDurationSeconds;

    // For HITL
    private boolean requiresReview;
    private String reviewId;               // HITL queue ID
    private Integer estimatedWaitSeconds;   // For frontend to show
    private String waitMessage;             // e.g., "Connecting to reviewer..."

    // For direct responses
    private Double confidenceScore;
    private List<String> confidenceReasons;
    private String intentType;

    // Context info (for debugging/transparency)
    private List<ContextInfo> contextUsed;
    private String sourceInfo;              // e.g., "From your notes on Jan 15"

    // Timing
    private long processingTimeMs;
    private LocalDateTime timestamp;

    // Suggestions for follow-up
    private List<String> suggestedQuestions;

    // Error handling
    private String errorCode;
    private String errorMessage;
    private String userFriendlyError;       // For dementia patients

    public enum ResponseStatus {
        SUCCESS,                    // Everything done
        PROCESSING,                 // Still working (for polling)
        REVIEW_REQUIRED,            // Sent to HITL
        REVIEW_COMPLETED,           // HITL response ready
        ERROR,                       // Something failed
        TIMEOUT                      // Took too long
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContextInfo {
        private String type;          // "note", "medication", "routine"
        private String title;
        private String summary;        // Short version for display
        private String sourceId;
    }

    // Factory methods for common responses
    public static VoiceResponse success(String interactionId,
                                        String transcription,
                                        String textResponse,
                                        String audioUrl) {
        return VoiceResponse.builder()
                .interactionId(interactionId)
                .status(ResponseStatus.SUCCESS)
                .transcription(transcription)
                .textResponse(textResponse)
                .audioUrl(audioUrl)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static VoiceResponse reviewRequired(String interactionId,
                                               String transcription,
                                               String reviewId,
                                               int estimatedWaitSeconds) {
        return VoiceResponse.builder()
                .interactionId(interactionId)
                .status(ResponseStatus.REVIEW_REQUIRED)
                .transcription(transcription)
                .reviewId(reviewId)
                .estimatedWaitSeconds(estimatedWaitSeconds)
                .waitMessage("A human reviewer will respond shortly...")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static VoiceResponse error(String interactionId,
                                      String transcription,
                                      String errorMessage,
                                      String userFriendlyError) {
        return VoiceResponse.builder()
                .interactionId(interactionId)
                .status(ResponseStatus.ERROR)
                .transcription(transcription)
                .errorMessage(errorMessage)
                .userFriendlyError(userFriendlyError)
                .timestamp(LocalDateTime.now())
                .build();
    }
}