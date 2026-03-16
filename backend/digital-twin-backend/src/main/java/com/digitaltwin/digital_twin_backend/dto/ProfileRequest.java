package com.digitaltwin.digital_twin_backend.dto;

import com.digitaltwin.digital_twin_backend.model.User;
import lombok.Data;
import java.util.List;

@Data
public class ProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String address;
    private String caregiverId;
    private List<User.EmergencyContact> emergencyContacts;
    private User.UserPreferences preferences; // ✅ Direct use of User.UserPreferences
}