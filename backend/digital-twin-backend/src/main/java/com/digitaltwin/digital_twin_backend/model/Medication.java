package com.digitaltwin.digital_twin_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Medication Model
 * Stores medication information for dementia patients
 */
// ... existing imports
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "medications")
public class Medication {
    @Id
    private String id;
    private String userId;
    private String name;
    private String dosage;
    private String frequency; // Added to match UI
    private String instructions;
    private String sideEffects; // Added to match UI
    private String prescribedBy;

    private List<LocalTime> scheduledTimes = new ArrayList<>();
    private List<String> daysOfWeek = new ArrayList<>();

    private boolean active = true;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private int reminderMinutesBefore = 15;
    private List<MedicationLog> logs = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicationLog {
        private LocalDateTime scheduledTime;
        private LocalDateTime actualTime;
        private MedicationStatus status;
        private String notes;
    }

    public enum MedicationStatus {
        TAKEN, MISSED, SKIPPED, PENDING
    }
}