package com.digitaltwin.digital_twin_backend.service;


import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConnectionService {

    private final UserRepository userRepository;

    /**
     * Caregiver ke saare linked patients return karta hai
     *
     * @param caregiverId - Caregiver's unique ID
     * @return List of patients (as UserDTO) linked to this caregiver
     */
    public List<UserDTO> getLinkedPatients(String caregiverId) {
        // 1. Verify ki user actually caregiver hai
        User caregiver = userRepository.findById(caregiverId)
                .orElseThrow(() -> new RuntimeException("Caregiver not found"));

        if (caregiver.getUserType() != User.UserType.CAREGIVER) {
            throw new RuntimeException("User is not a caregiver");
        }

        // 2. Find all patients jinhone is caregiver ko add kiya hai
        // Option 1: Using Spring Data method naming convention
        List<User> patients = userRepository.findByCaregiverIdsContaining(caregiverId);

        // Option 2: Alternative using @Query method (same result)
        // List<User> patients = userRepository.findPatientsByCaregiver(caregiverId);

        // 3. Convert to DTO and return
        return patients.stream()
                .map(UserDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Patient ke saare linked caregivers return karta hai
     *
     * @param patientId - Patient's unique ID
     * @return List of caregivers (as UserDTO) linked to this patient
     */
    public List<UserDTO> getLinkedCaregivers(String patientId) {
        // 1. Find patient
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        // 2. Patient ke caregiverIds list se caregivers fetch karo
        if (patient.getCaregiverIds() == null || patient.getCaregiverIds().isEmpty()) {
            return List.of(); // Empty list if no caregivers
        }

        // 3. Fetch all caregivers by IDs
        List<User> caregivers = userRepository.findCaregiversByIds(patient.getCaregiverIds());

        // 4. Convert to DTO and return
        return caregivers.stream()
                .map(UserDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Get total count of patients linked to a caregiver
     *
     * @param caregiverId - Caregiver's unique ID
     * @return Count of linked patients
     */
    public long getLinkedPatientsCount(String caregiverId) {
        return userRepository.countByCaregiverIdsContaining(caregiverId);
    }

    /**
     * Check if a patient is linked to a specific caregiver
     *
     * @param patientId - Patient's ID
     * @param caregiverId - Caregiver's ID
     * @return true if linked, false otherwise
     */
    public boolean isPatientLinkedToCaregiver(String patientId, String caregiverId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        return patient.getCaregiverIds() != null
                && patient.getCaregiverIds().contains(caregiverId);
    }
}