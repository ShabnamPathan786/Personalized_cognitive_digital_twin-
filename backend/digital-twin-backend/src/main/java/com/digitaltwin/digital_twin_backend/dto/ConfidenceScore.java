package com.digitaltwin.digital_twin_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.Map;

/**
 * Confidence Score DTO
 * Represents how confident AI is about handling the query
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfidenceScore {

    private double score;               // 0-100
    private double threshold;            // e.g., 70 for direct response
    private boolean highConfidence;      // score >= threshold

    // Breakdown of score
    private Map<String, Double> factors; // contextWeight, intentWeight, etc.
    private List<String> reasons;         // Why this score
    private List<String> suggestions;      // How to improve

    // For decision making
    private Decision decision;

    // Additional metadata
    private String intentType;
    private int contextCount;              // Number of context items found
    private boolean hasExactMatch;         // Perfect context match found
    private float queryComplexity;          // 0-1 (simple to complex)

    public enum Decision {
        DIRECT_LLM,          // High confidence, use LLM
        HITL_REVIEW,         // Low confidence, send to human
        FALLBACK,            // Very low confidence, use simple response
        ESCALATE             // Emergency, notify immediately
    }

    // Factory methods
    public static ConfidenceScore high(double score, List<String> reasons) {
        return ConfidenceScore.builder()
                .score(score)
                .threshold(70)
                .highConfidence(true)
                .decision(Decision.DIRECT_LLM)
                .reasons(reasons)
                .build();
    }

    public static ConfidenceScore low(double score, List<String> reasons) {
        return ConfidenceScore.builder()
                .score(score)
                .threshold(70)
                .highConfidence(false)
                .decision(Decision.HITL_REVIEW)
                .reasons(reasons)
                .build();
    }

    public static ConfidenceScore emergency() {
        return ConfidenceScore.builder()
                .score(0)
                .threshold(70)
                .highConfidence(false)
                .decision(Decision.ESCALATE)
                .reasons(List.of("Emergency keywords detected"))
                .build();
    }

    // Helper methods
    public boolean requiresHITL() {
        return decision == Decision.HITL_REVIEW;
    }

    public boolean isEmergency() {
        return decision == Decision.ESCALATE;
    }

    public String getPrimaryReason() {
        return reasons != null && !reasons.isEmpty() ? reasons.get(0) : "Unknown";
    }

    // Format for logging
    public String toLogString() {
        return String.format("Score: %.1f/100, Decision: %s, Reasons: %s",
                score, decision, reasons);
    }
}