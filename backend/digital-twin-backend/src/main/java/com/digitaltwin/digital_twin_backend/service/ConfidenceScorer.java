package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.ConfidenceScore;
import com.digitaltwin.digital_twin_backend.dto.Intent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ConfidenceScorer {

    private static final double CONTEXT_WEIGHT = 0.40; // 40%
    private static final double INTENT_WEIGHT = 0.30; // 30%
    private static final double SPECIFICITY_WEIGHT = 0.20; // 20%
    private static final double HISTORY_WEIGHT = 0.10; // 10%

    private static final double DEMENTIA_THRESHOLD = 65.0;
    private static final double NORMAL_THRESHOLD = 70.0;

    private static final List<String> EMERGENCY_KEYWORDS = List.of(
            "help", "bachao", "emergency", "sos", "ambulance",
            "hospital", "doctor", "pain", "dard", "gir gaya");

    public ConfidenceScore calculate(String query, String context, Intent intent, String userType) {

        Map<String, Double> factors = new HashMap<>();
        List<String> reasons = new ArrayList<>();

        // Check emergency first — bypass scoring entirely
        // ✅ Bypass scoring for emergency
        if (isEmergency(query)) {
            return ConfidenceScore.emergency();
        }

        // ✅ ADD THIS — Bypass scoring for greetings, always direct LLM
        if ("GREETING".equals(intent.getType())) {
            double threshold = "DEMENTIA_PATIENT".equals(userType) ? DEMENTIA_THRESHOLD : NORMAL_THRESHOLD;
            return ConfidenceScore.builder()
                    .score(95.0)
                    .threshold(threshold)
                    .highConfidence(true)
                    .decision(ConfidenceScore.Decision.DIRECT_LLM)
                    .factors(new HashMap<>())
                    .reasons(List.of("Greeting — direct response"))
                    .intentType("GREETING")
                    .contextCount(0)
                    .hasExactMatch(false)
                    .queryComplexity(0.95f)
                    .build();
        }

        if ("GENERAL_CHAT".equals(intent.getType())) {
            double threshold = "DEMENTIA_PATIENT".equals(userType) ? DEMENTIA_THRESHOLD : NORMAL_THRESHOLD;
            return ConfidenceScore.builder()
                    .score(85.0)
                    .threshold(threshold)
                    .highConfidence(true)
                    .decision(ConfidenceScore.Decision.DIRECT_LLM)
                    .factors(new HashMap<>())
                    .reasons(List.of("General conversation — respond directly"))
                    .intentType("GENERAL_CHAT")
                    .contextCount(0)
                    .hasExactMatch(false)
                    .queryComplexity(0.8f)
                    .build();
        }

        double weightedSum = 0.0;

        // Factor 1: Context relevance (40%) — sub-score is 0.0–1.0
        double contextScore = calculateContextScore(context);
        factors.put("context", contextScore);
        weightedSum += contextScore * CONTEXT_WEIGHT;

        if (contextScore < 0.5) {
            reasons.add("Limited relevant context found");
        } else if (contextScore > 0.8) {
            reasons.add("Good context match");
        }

        // Factor 2: Intent clarity (30%) — sub-score is 0.0–1.0
        double intentScore = intent.getConfidence();
        factors.put("intent", intentScore);
        weightedSum += intentScore * INTENT_WEIGHT;

        if (intentScore < 0.6) {
            reasons.add("Unclear intent");
        } else if (intentScore > 0.8) {
            reasons.add("Clear intent");
        }

        // Factor 3: Query specificity (20%) — sub-score is 0.0–1.0
        double specificityScore = calculateSpecificity(query);
        factors.put("specificity", specificityScore);
        weightedSum += specificityScore * SPECIFICITY_WEIGHT;

        if (specificityScore < 0.4) {
            reasons.add("Query is vague");
        }

        // Factor 4: History (10%) — placeholder sub-score 0.0–1.0
        double historyScore = 0.5;
        factors.put("history", historyScore);
        weightedSum += historyScore * HISTORY_WEIGHT;

        if (historyScore < 0.3) {
            reasons.add("New type of query");
        }

        // ✅ FIX: weightedSum is 0.0–1.0 (weights sum to 1.0), scale to 0–100
        double score = weightedSum * 100.0;

        // Apply dementia bonus AFTER scaling (adds 5 points out of 100)
        boolean isDementia = "DEMENTIA_PATIENT".equals(userType);
        if (isDementia) {
            score += 5.0;
        }

        // Cap at 100
        score = Math.min(score, 100.0);

        log.debug("Confidence score calculated: {}/100 for userType: {}", score, userType);

        double threshold = isDementia ? DEMENTIA_THRESHOLD : NORMAL_THRESHOLD;
        boolean highConfidence = score >= threshold;

        return ConfidenceScore.builder()
                .score(score)
                .threshold(threshold)
                .highConfidence(highConfidence)
                .decision(highConfidence ? ConfidenceScore.Decision.DIRECT_LLM : ConfidenceScore.Decision.HITL_REVIEW)
                .factors(factors)
                .reasons(reasons)
                .intentType(intent.getType())
                .contextCount(context != null ? context.split("\n").length : 0)
                .hasExactMatch(contextScore > 0.9)
                .queryComplexity((float) specificityScore)
                .build();
    }

    private boolean isEmergency(String query) {
        String lowerQuery = query.toLowerCase();
        return EMERGENCY_KEYWORDS.stream().anyMatch(lowerQuery::contains);
    }

    private double calculateContextScore(String context) {
        if (context == null || context.trim().isEmpty()) {
            return 0.0;
        }

        String[] lines = context.split("\n");
        int lineCount = lines.length;

        if (lineCount == 0)
            return 0.0;
        if (lineCount == 1)
            return 0.3;
        if (lineCount == 2)
            return 0.6;
        return 0.9; // 3+
    }

    private double calculateSpecificity(String query) {
        String[] words = query.toLowerCase().split("\\s+");

        List<String> stopWords = List.of("hai", "hain", "tha", "the", "ko",
                "se", "mein", "ka", "ki", "ke");

        long meaningfulWords = java.util.Arrays.stream(words)
                .filter(w -> w.length() > 2)
                .filter(w -> !stopWords.contains(w))
                .count();

        if (meaningfulWords == 0)
            return 0.2;
        if (meaningfulWords == 1)
            return 0.4;
        if (meaningfulWords == 2)
            return 0.6;
        if (meaningfulWords == 3)
            return 0.8;
        return 1.0;
    }
}
