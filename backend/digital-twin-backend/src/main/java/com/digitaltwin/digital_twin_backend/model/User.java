package com.digitaltwin.digital_twin_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection="users")
public class User {
    @Id
    private String id;

    @Indexed(unique=true)
    private String username;

    @Indexed(unique=true)
    private String email;

    private String password;
    private String fullName;
    private String profilePictureUrl;
    private String phoneNumber;
    private UserType userType;
    private List<String> caregiverIds=new ArrayList<>();
    private List<EmergencyContact> emergencyContacts=new ArrayList<>();
    private UserPreferences preferences;

    public enum UserType{
        NORMAL,
        CAREGIVER,
        DEMENTIA_PATIENT
    }

    private boolean active=true;
    private boolean emailVerified=false;
    private boolean phoneVerified=false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime lastLoginAt;

@Data
@NoArgsConstructor
@AllArgsConstructor
    public class EmergencyContact {
        private String name;
        private String relationship;
        private String email;
        private String phoneNumber;
        private boolean primaryContact;

}

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPreferences {
        private boolean emailNotifications = true;
        private boolean smsNotifications = true;
        private boolean pushNotifications = true;
        private String language = "en";
        private String timezone = "Asia/Kolkata";

        // Dementia care specific preferences
        private boolean medicationReminders = true;
        private boolean routineReminders = true;
        private boolean locationTracking = false; // Requires consent
        private int medicationReminderMinutesBefore = 15;
    }


}
