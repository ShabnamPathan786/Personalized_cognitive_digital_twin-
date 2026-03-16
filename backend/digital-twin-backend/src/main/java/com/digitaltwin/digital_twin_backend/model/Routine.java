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
 * Routine Model
 * Stores daily routine activities for dementia patients
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "routines")
public class Routine {

    @Id
    private String id;

    private String userId; // Patient ID

    private String activityName;
    private String description;
    private ActivityCategory category;

    private LocalTime scheduledTime;
    private int durationMinutes;

    private List<String> daysOfWeek = new ArrayList<>(); // Days this routine is active
    private boolean reminderEnabled = true;
    private int reminderMinutesBefore = 15;

    private boolean active = true;

    private List<RoutineLog> logs = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ActivityCategory {
        MORNING_ROUTINE,    // Wake up, breakfast, etc.
        HYGIENE,           // Shower, brushing teeth
        MEALS,             // Breakfast, lunch, dinner
        EXERCISE,          // Walking, physical therapy
        SOCIAL,            // Family time, phone calls
        MEDICATION,        // Medication time
        RECREATION,        // Hobbies, TV, reading
        BEDTIME,           // Evening routine, sleep
        APPOINTMENTS,      // Doctor visits, meetings
        OTHER
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoutineLog {
        private LocalDateTime scheduledDateTime;
        private LocalDateTime completedDateTime;
        private RoutineStatus status;
        private String notes;
        private String completedBy; // User ID who marked it complete (patient or caregiver)
    }

    public enum RoutineStatus {
        COMPLETED,
        SKIPPED,
        MISSED,
        PENDING
    }
}