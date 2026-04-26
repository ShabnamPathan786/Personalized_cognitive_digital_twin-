package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.Intent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class IntentClassifier {

    private static final Map<String, List<String>> INTENT_PATTERNS = new HashMap<>();
    private static final Map<String, List<String>> SUBTYPE_PATTERNS = new HashMap<>();
    private static final Map<String, List<String>> ENTITY_PATTERNS = new HashMap<>();

    static {
        // Add to INTENT_PATTERNS static block
        INTENT_PATTERNS.put("GREETING", List.of(
            "hello", "hi", "hey", "namaste", "helo",
            "good morning", "good afternoon", "good evening",
            "how are you", "kaise ho", "हेलो", "हैलो", "नमस्ते", "कैसे हो"
        ));
        // MEMORY_OFFLOAD patterns
        INTENT_PATTERNS.put("MEMORY_OFFLOAD", List.of(
                "kal kya padha", "kya likha tha", "kya note kiya",
                "kya yaad hai", "kya bataya tha", "kya hua tha",
                "कल क्या पढ़ा", "क्या लिखा था", "क्या नोट किया",
                "क्या याद है", "क्या बताया था", "क्या हुआ था",
                "what did i read", "what did i write", "what happened"));

        // MEDICATION_QUERY patterns
        INTENT_PATTERNS.put("MEDICATION_QUERY", List.of(
                "medicine", "dawai", "kab lena", "kya khana",
                "medication", "pill", "dose", "tablet",
                "दवाई", "दवा", "कब लेना", "क्या खाना", "गोली"));

        // ROUTINE_QUERY patterns
        INTENT_PATTERNS.put("ROUTINE_QUERY", List.of(
                "next", "routine", "schedule", "kya karna",
                "ab kya", "uske baad", "time kya",
                "रूटीन", "शेड्यूल", "क्या करना", "अब क्या", "उसके बाद", "समय क्या"));

        // Subtype patterns
        SUBTYPE_PATTERNS.put("DOCTOR_VISIT", List.of("doctor", "dr", "hospital", "clinic", "डॉक्टर", "अस्पताल", "क्लिनिक"));
        SUBTYPE_PATTERNS.put("MEDICINE_TIME", List.of("time", "kab", "baje", "समय", "कब", "बजे"));
        SUBTYPE_PATTERNS.put("FAMILY", List.of("beta", "beti", "pati", "wife", "husband", "बेटा", "बेटी", "पति", "पत्नी"));

        // Entity patterns
        ENTITY_PATTERNS.put("date", List.of("kal", "aaj", "parson", "yesterday", "today", "कल", "आज", "परसों"));
        ENTITY_PATTERNS.put("person", List.of("doctor", "beta", "beti", "pati", "डॉक्टर", "बेटा", "बेटी", "पति"));
        ENTITY_PATTERNS.put("medicine", List.of("dawai", "medicine", "tablet", "pill", "दवाई", "दवा", "गोली"));
    }

    public Intent classify(String text, String userType) {
        String lowerText = text.toLowerCase();

        Map<String, String> entities = extractEntities(lowerText);
        String intentType = detectIntentType(lowerText);
        String subType = detectSubType(lowerText, intentType);
        float confidence = calculateConfidence(lowerText, intentType);
        List<String> keywords = extractKeywords(lowerText);
        Intent.TimeReference timeRef = detectTimeReference(lowerText);

        // ✅ FIX: Use .emergency() instead of .isEmergency() to match renamed field
        return Intent.builder()
                .type(intentType)
                .subType(subType)
                .confidence(confidence)
                .entities(entities)
                .keywords(keywords)
                .timeReference(timeRef)
                .emergency(isEmergency(lowerText)) // ✅ fixed: was .isEmergency()
                .emergencyType(detectEmergencyType(lowerText))
                .memoryTopic(extractMemoryTopic(lowerText, intentType))
                .build();
    }

    private String detectIntentType(String text) {
        for (Map.Entry<String, List<String>> entry : INTENT_PATTERNS.entrySet()) {
            for (String pattern : entry.getValue()) {
                if (text.contains(pattern)) {
                    return entry.getKey();
                }
            }
        }
        return "GENERAL_CHAT";
    }

    private String detectSubType(String text, String intentType) {
        if (!"MEMORY_OFFLOAD".equals(intentType)) {
            return null;
        }

        for (Map.Entry<String, List<String>> entry : SUBTYPE_PATTERNS.entrySet()) {
            for (String pattern : entry.getValue()) {
                if (text.contains(pattern)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    private Map<String, String> extractEntities(String text) {
        Map<String, String> entities = new HashMap<>();

        for (Map.Entry<String, List<String>> entry : ENTITY_PATTERNS.entrySet()) {
            for (String pattern : entry.getValue()) {
                if (text.contains(pattern)) {
                    entities.put(entry.getKey(), pattern);
                    break;
                }
            }
        }

        return entities;
    }

    private float calculateConfidence(String text, String intentType) {
        if ("GREETING".equals(intentType)) {
            return 0.95f;
        }
        if ("GENERAL_CHAT".equals(intentType)) {
            return 0.3f;
        }

        List<String> patterns = INTENT_PATTERNS.get(intentType);
        if (patterns == null)
            return 0.5f;

        long matches = patterns.stream()
                .filter(text::contains)
                .count();

        if (matches == 0)
            return 0.3f;
        if (matches == 1)
            return 0.6f;
        if (matches == 2)
            return 0.8f;
        return 0.9f;
    }

    private List<String> extractKeywords(String text) {
        List<String> stopWords = List.of("hai", "hain", "tha", "the", "ko", "se",
                "mein", "ka", "ki", "ke", "aur", "to", "bhi");

        return Arrays.stream(text.split("\\s+"))
                .filter(w -> w.length() > 2)
                .filter(w -> !stopWords.contains(w))
                .distinct()
                .toList();
    }

    private Intent.TimeReference detectTimeReference(String text) {
        if (text.contains("kal") || text.contains("yesterday")) {
            return Intent.TimeReference.YESTERDAY;
        }
        if (text.contains("aaj") || text.contains("today")) {
            return Intent.TimeReference.TODAY;
        }
        if (text.contains("parson") || text.contains("tomorrow")) {
            return Intent.TimeReference.TOMORROW;
        }
        return Intent.TimeReference.NO_REFERENCE;
    }

    private boolean isEmergency(String text) {
        List<String> emergencyWords = List.of("bachao", "help", "sos", "emergency", "बचाओ", "मदद", "आपातकाल");
        return emergencyWords.stream().anyMatch(text::contains);
    }

    private String detectEmergencyType(String text) {
        if (text.contains("gir") || text.contains("fall") || text.contains("गिर"))
            return "FALL";
        if (text.contains("dard") || text.contains("pain") || text.contains("दर्द"))
            return "MEDICAL";
        return "SOS";
    }

    private String extractMemoryTopic(String text, String intentType) {
        if (!"MEMORY_OFFLOAD".equals(intentType)) {
            return null;
        }

        for (String topic : List.of("doctor", "medicine", "family", "hospital", "डॉक्टर", "दवाई", "परिवार", "अस्पताल")) {
            if (text.contains(topic)) {
                return topic;
            }
        }
        return "general";
    }
}
