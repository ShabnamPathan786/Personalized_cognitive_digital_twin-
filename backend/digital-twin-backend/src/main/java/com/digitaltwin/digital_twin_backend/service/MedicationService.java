package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.model.Medication;
import com.digitaltwin.digital_twin_backend.repository.MedicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Medication Service
 * Manages medications for dementia patients
 */
@Service
@RequiredArgsConstructor
public class MedicationService {

    private final MedicationRepository medicationRepository;

    /**
     * Create new medication
     */
    public Medication createMedication(Medication medication) {
        medication.setActive(true);
        medication.setCreatedAt(LocalDateTime.now());
        return medicationRepository.save(medication);
    }

    /**
     * Get medication by ID
     */
    public Medication getMedicationById(String id) {
        return medicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medication not found"));
    }

    /**
     * Get all medications for a user
     */
    public List<Medication> getUserMedications(String userId) {
        return medicationRepository.findByUserId(userId);
    }

    /**
     * Get active medications for a user
     */
    public List<Medication> getActiveMedications(String userId) {
        return medicationRepository.findByUserIdAndActiveTrue(userId);
    }

    /**
     * Update medication
     */
    // ... existing methods
    public Medication updateMedication(String id, Medication updatedMedication) {
        Medication medication = getMedicationById(id);

        medication.setName(updatedMedication.getName());
        medication.setDosage(updatedMedication.getDosage());
        medication.setFrequency(updatedMedication.getFrequency()); // Added
        medication.setInstructions(updatedMedication.getInstructions());
        medication.setSideEffects(updatedMedication.getSideEffects()); // Added
        medication.setPrescribedBy(updatedMedication.getPrescribedBy());
        medication.setScheduledTimes(updatedMedication.getScheduledTimes());
        medication.setDaysOfWeek(updatedMedication.getDaysOfWeek());
        medication.setReminderMinutesBefore(updatedMedication.getReminderMinutesBefore());
        medication.setStartDate(updatedMedication.getStartDate()); // Added
        medication.setEndDate(updatedMedication.getEndDate());
        medication.setUpdatedAt(LocalDateTime.now());

        return medicationRepository.save(medication);
    }
    // ... rest of file

    /**
     * Log medication taken
     */
    public Medication logMedicationTaken(String id, LocalDateTime scheduledTime,
            LocalDateTime actualTime, String notes) {
        Medication medication = getMedicationById(id);

        Medication.MedicationLog log = new Medication.MedicationLog();
        log.setScheduledTime(scheduledTime);
        log.setActualTime(actualTime);
        log.setStatus(Medication.MedicationStatus.TAKEN);
        log.setNotes(notes);

        medication.getLogs().add(log);
        medication.setUpdatedAt(LocalDateTime.now());

        return medicationRepository.save(medication);
    }

    /**
     * Log medication missed
     */
    public Medication logMedicationMissed(String id, LocalDateTime scheduledTime, String notes) {
        Medication medication = getMedicationById(id);

        Medication.MedicationLog log = new Medication.MedicationLog();
        log.setScheduledTime(scheduledTime);
        log.setStatus(Medication.MedicationStatus.MISSED);
        log.setNotes(notes);

        medication.getLogs().add(log);
        medication.setUpdatedAt(LocalDateTime.now());

        return medicationRepository.save(medication);
    }

    /**
     * Deactivate medication
     */
    public Medication deactivateMedication(String id) {
        Medication medication = getMedicationById(id);
        medication.setActive(false);
        medication.setUpdatedAt(LocalDateTime.now());
        return medicationRepository.save(medication);
    }

    /**
     * Delete medication
     */
    public void deleteMedication(String id) {
        medicationRepository.deleteById(id);
    }

    public List<Medication> getUpcomingMedications(String userId) {
        List<Medication> active = medicationRepository.findByUserIdAndActiveTrue(userId);
        LocalTime now = LocalTime.now();

        // Filter only medications that have a scheduled time coming up today
        return active.stream()
                .filter(med -> med.getScheduledTimes() != null &&
                        med.getScheduledTimes().stream().anyMatch(t -> t.isAfter(now)))
                .collect(java.util.stream.Collectors.toList());
    }

    public List<Medication.MedicationLog> getMedicationLogs(String id) {
        Medication medication = getMedicationById(id);
        return medication.getLogs() != null ? medication.getLogs() : new ArrayList<>();
    }
}
