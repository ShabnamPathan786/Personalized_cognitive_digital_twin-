package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.ProfileRequest;
import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;

    @Transactional
    public UserDTO completeUserProfile(String userId, ProfileRequest request) {
        // 1. Patient ko dhundo
        User patient = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        // 2. Caregiver ID validate aur link karo
        if (request.getCaregiverId() != null && !request.getCaregiverId().isEmpty()) {
            validateAndLinkCaregiver(patient, request.getCaregiverId());
        }

        // 3. Baaki profile fields update karo - SIRF AGAR NULL NAHI HAIN TOH
        if (request.getFullName() != null) {
            patient.setFullName(request.getFullName());
        }

        if (request.getPhoneNumber() != null) {
            patient.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getAddress() != null) { // ✅ Added address field with null check
            patient.setAddress(request.getAddress());
        }

        // ✅ Emergency contacts - null check
        if (request.getEmergencyContacts() != null) {
            patient.setEmergencyContacts(request.getEmergencyContacts());
        }

        // ✅ Preferences - null check
        if (request.getPreferences() != null) {
            patient.setPreferences(request.getPreferences());
        }

        // 4. Save and Return
        User savedUser = userRepository.save(patient);
        return new UserDTO(savedUser);
    }

    private void validateAndLinkCaregiver(User patient, String caregiverId) {
        User caregiver = userRepository.findById(caregiverId)
                .orElseThrow(() -> new RuntimeException("Caregiver ID invalid: User not found"));

        if (caregiver.getUserType() != User.UserType.CAREGIVER) {
            throw new RuntimeException("The ID provided does not belong to a Caregiver account");
        }

        // Link only if not already linked
        if (!patient.getCaregiverIds().contains(caregiverId)) {
            patient.getCaregiverIds().add(caregiverId);
        }
    }
}