package com.digitaltwin.digital_twin_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Emergency Alert Model
 * Stores emergency alerts triggered by dementia patients or system
 */
@Data
@AllArgsConstructor
@Document(collection = "emergency_alerts")
public class EmergencyAlert {

    @Id
    private String id;

    private String patientId; // Dementia patient who triggered alert
    private String patientName;

    private AlertType alertType;
    private AlertSeverity severity;

    private String message;
    private String location; // GPS coordinates or address

    private List<String> notifiedCaregiverIds = new ArrayList<>();
    private List<NotificationLog> notifications = new ArrayList<>();

    private AlertStatus status;
    private String resolvedBy; // Caregiver ID who resolved
    private LocalDateTime resolvedAt;
    private String resolutionNotes;

    @CreatedDate
    private LocalDateTime createdAt;

    // ✅ SIRF EK CONSTRUCTOR - @NoArgsConstructor hata diya
    public EmergencyAlert() {
        this.notifiedCaregiverIds = new ArrayList<>();
        this.notifications = new ArrayList<>();
    }

    public enum AlertType {
        MEDICATION_MISSED,      // Missed medication
        ROUTINE_MISSED,         // Missed important routine
        MANUAL_SOS,            // Patient pressed emergency button
        WANDERING_DETECTED,    // Patient left safe zone (geofencing)
        FALL_DETECTED,         // Fall detection sensor
        UNUSUAL_INACTIVITY,    // No activity for extended period
        HEALTH_VITALS,         // Abnormal health vitals
        OTHER
    }

    public enum AlertSeverity {
        LOW,      // Informational
        MEDIUM,   // Requires attention
        HIGH,     // Urgent
        CRITICAL  // Immediate action required
    }

    public enum AlertStatus {
        ACTIVE,
        ACKNOWLEDGED,
        RESOLVED,
        FALSE_ALARM
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationLog {
        private String caregiverId;
        private String caregiverName;
        private NotificationMethod method; // SMS, EMAIL, PUSH
        private LocalDateTime sentAt;
        private boolean delivered;
        private LocalDateTime acknowledgedAt;
    }

    public enum NotificationMethod {
        SMS,
        EMAIL,
        PUSH_NOTIFICATION,
        PHONE_CALL
    }
}