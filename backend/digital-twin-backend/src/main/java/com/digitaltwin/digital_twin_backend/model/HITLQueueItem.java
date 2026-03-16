package com.digitaltwin.digital_twin_backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

/**
 * HITL Queue Item Model
 * Stores items waiting for human review when AI is not confident
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "hitl_queue")
@CompoundIndex(name = "status_created", def = "{'status': 1, 'createdAt': -1}")
public class HITLQueueItem {

    @Id
    private String id;

    // User information
    @Indexed
    private String userId;
    private String userFullName;
    private String userEmail;
    private String userPhone;
    private String userType;
    // DEMENTIA_PATIENT, CAREGIVER, NORMAL

    private String username;

    // Query details
    private String query;              // Original transcription
    private String queryLanguage;      // hi, en, etc.
    private float transcriptionConfidence;

    // Context retrieved
    private String retrievedContext;    // Formatted context given to LLM
    private List<ContextSourceSummary> contextSources = new ArrayList<>();

    // Confidence scoring
    private double confidenceScore;     // 0-100
    private List<String> confidenceReasons; // Why low confidence
    private String intentType;
    private String intentSubType;

    // Priority (for sorting queue)
    private PriorityLevel priority;
    private String priorityReason;      // e.g., "DEMENTIA_PATIENT", "EMERGENCY_KEYWORD"

    // Status
    private QueueStatus status;

    // AI suggestion (optional, can be generated)
    private String aiSuggestion;
    private String aiSuggestionAudioUrl;

    // Review details
    private String reviewerId;
    private String reviewerName;
    private String reviewedResponse;
    private String reviewedResponseAudioUrl;
    private String reviewerNotes;
    private LocalDateTime assignedAt;
    private LocalDateTime reviewedAt;
    private int reviewDurationSeconds;   // How long reviewer took


    // Add these fields in HITLQueueItem class

    private String sessionId;  // Add this field
    private String previousQueueId; // Already there but ensure getter/setter

    // Add getters/setters if using @Data (Lombok will handle)
    // Timestamps
    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;     // Auto-expire after X minutes
    private LocalDateTime notifiedAt;    // When reviewers were notified

    // Retry count (if expired and requeued)
    private int retryCount = 0;


    public enum QueueStatus {
        PENDING,        // Waiting for reviewer
        ASSIGNED,       // Reviewer has taken it
        IN_PROGRESS,    // Reviewer is typing
        REVIEWED,       // Completed
        EXPIRED,        // No one took it in time
        REJECTED,       // Reviewer rejected (inappropriate)
        CANCELLED       // User cancelled or disconnected
    }

    public enum PriorityLevel {
        CRITICAL,       // Emergency keywords detected
        HIGH,           // Dementia patient
        MEDIUM,         // Normal user, complex query
        LOW            // Simple query, just low confidence
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContextSourceSummary {
        private String sourceType;      // NOTE, MEDICATION, ROUTINE, FILE
        private String sourceTitle;
        private String preview;         // First 100 chars
        private LocalDateTime createdAt;
        private double relevanceScore;
    }
}