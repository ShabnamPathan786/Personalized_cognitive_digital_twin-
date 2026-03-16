package com.digitaltwin.digital_twin_backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

/**
 * Voice Interaction Model
 * Stores each voice conversation between user and AI assistant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "voice_interactions")
public class VoiceInteraction {

    @Id
    private String id;

    @Indexed
    private String userId;          // User who spoke

    private String userFullName;     // For quick display
    private String userType;          // DEMENTIA_PATIENT, CAREGIVER, NORMAL

    // Audio tracking
    private String audioFileId;       // GridFS ID of user's audio
    private String audioUrl;          // URL to user's audio (if saved)

    // Transcription
    private String transcription;      // What user said (text)
    private float transcriptionConfidence; // AssemblyAI confidence score

    // Intent detection
    private String intentType;         // MEMORY_OFFLOAD, MEDICATION_QUERY, ROUTINE_QUERY, GENERAL_CHAT, EMERGENCY
    private String intentSubType;      // e.g., DOCTOR_VISIT, MEDICINE_TIME
    private float intentConfidence;    // 0.0 to 1.0

    // Context retrieval
    private List<ContextSource> contextSources = new ArrayList<>(); // Where info came from
    private String retrievedContext;    // Formatted context given to LLM

    // Confidence scoring
    private double confidenceScore;     // 0-100
    private List<String> confidenceReasons; // Why this score
    private boolean highConfidence;      // true if >= threshold

    // LLM response
    private String llmResponse;          // Text response from LLM
    private String responseAudioFileId;  // GridFS ID of TTS audio
    private String responseAudioUrl;     // URL to TTS audio
    private long responseTimeMs;         // How long LLM took

    // HITL tracking
    private boolean requiredHITL;        // Was this sent to human review?
    private String hitlQueueId;          // If yes, reference to queue item
    private boolean reviewedByHITL;      // Was it actually reviewed?
    private String reviewerId;            // Who reviewed it
    private LocalDateTime reviewedAt;     // When reviewed


    private boolean emergencyDetected;
    private String error;
    // Status tracking
    private VoiceStatus status;
    private List<ProcessingStep> processingSteps = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;





    public enum VoiceStatus {
        RECORDING,           // User is still speaking
        TRANSCRIBING,        // AssemblyAI processing
        PROCESSING,          // LLM/HITL decision
        WAITING_FOR_HITL,    // In queue for review
        COMPLETED,           // Response sent
        FAILED,              // Something went wrong
        TIMEOUT              // HITL timeout
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContextSource {
        private String sourceType;      // NOTE, MEDICATION, ROUTINE, FILE
        private String sourceId;        // ID of the document
        private String sourceTitle;     // Title/name for display
        private double relevanceScore;  // How relevant (0-1)
        private LocalDateTime retrievedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessingStep {
        private String stepName;        // e.g., "TRANSCRIPTION", "INTENT_DETECTION"
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private long durationMs;
        private boolean success;
        private String errorMessage;
    }
}