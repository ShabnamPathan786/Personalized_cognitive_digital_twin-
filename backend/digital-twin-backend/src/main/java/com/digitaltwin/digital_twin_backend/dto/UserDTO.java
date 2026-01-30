package com.digitaltwin.digital_twin_backend.dto;




import com.digitaltwin.digital_twin_backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * User Data Transfer Object
 * Used to send user data to frontend (excludes password)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private String id;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String profilePictureUrl;
    private User.UserType userType;
    private List<String> caregiverIds = new ArrayList<>();
    private List<User.EmergencyContact> emergencyContacts = new ArrayList<>();
    private User.UserPreferences preferences;
    private boolean active;
    private boolean emailVerified;
    private boolean phoneVerified;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;

    // Constructor from User entity
    public UserDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.phoneNumber = user.getPhoneNumber();
        this.profilePictureUrl = user.getProfilePictureUrl();
        this.userType = user.getUserType();
        this.caregiverIds = user.getCaregiverIds();
        this.emergencyContacts = user.getEmergencyContacts();
        this.preferences = user.getPreferences();
        this.active = user.isActive();
        this.emailVerified = user.isEmailVerified();
        this.phoneVerified = user.isPhoneVerified();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
        this.lastLoginAt = user.getLastLoginAt();
    }
}
