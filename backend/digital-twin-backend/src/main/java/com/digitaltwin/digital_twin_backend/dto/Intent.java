package com.digitaltwin.digital_twin_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.Map;

/**
 * Intent DTO
 * Represents detected intent from user's speech
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Intent {

    private String type;              // MEMORY_OFFLOAD, MEDICATION_QUERY, etc.
    private String subType;           // DOCTOR_VISIT, MEDICINE_TIME, etc.
    private float confidence;         // 0.0 to 1.0

    // Extracted entities
    private Map<String, String> entities;  // e.g., {"date": "kal", "person": "doctor"}
    private List<String> keywords;         // Important words from query

    // Time-related (for queries like "kal", "aaj")
    private TimeReference timeReference;

    // For memory offloading
    private String memoryTopic;
    private List<String> relatedTopics;

    // ✅ FIX: Renamed from 'isEmergency' to 'emergency'
    // Lombok @Data on a boolean field named 'isEmergency' generates isEmergency() as getter,
    // which clashes with our custom isEmergency() method below — compile error.
    // Renaming to 'emergency' makes Lombok generate isEmergency() as the getter cleanly,
    // and we remove the duplicate custom method entirely.
    private boolean emergency;
    private String emergencyType;     // "FALL", "SOS", "MEDICAL"

    public enum TimeReference {
        TODAY,
        YESTERDAY,
        TOMORROW,
        LAST_WEEK,
        NEXT_WEEK,
        SPECIFIC_DATE,
        NO_REFERENCE
    }

    // Helper methods
    public boolean isMemoryOffload() {
        return "MEMORY_OFFLOAD".equals(type);
    }

    public boolean isMedicationQuery() {
        return "MEDICATION_QUERY".equals(type);
    }

    public boolean isRoutineQuery() {
        return "ROUTINE_QUERY".equals(type);
    }

    // ✅ FIX: Single unified emergency check — covers both the flag and type string.
    // Lombok generates isEmergency() from the 'emergency' field, so we rename this
    // method to checkEmergency() to avoid the duplicate method compile error.
    public boolean checkEmergency() {
        return emergency || "EMERGENCY".equals(type);
    }

    public boolean isHighConfidence() {
        return confidence >= 0.8f;
    }

    public boolean isMediumConfidence() {
        return confidence >= 0.5f && confidence < 0.8f;
    }

    public boolean isLowConfidence() {
        return confidence < 0.5f;
    }

    // Get extracted date if any
    public String getDateEntity() {
        return entities != null ? entities.get("date") : null;
    }

    // Get extracted person if any
    public String getPersonEntity() {
        return entities != null ? entities.get("person") : null;
    }
}
