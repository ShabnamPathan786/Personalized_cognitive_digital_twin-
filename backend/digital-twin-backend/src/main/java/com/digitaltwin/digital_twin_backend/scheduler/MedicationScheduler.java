package com.digitaltwin.digital_twin_backend.scheduler;

import com.digitaltwin.digital_twin_backend.model.EmergencyAlert;
import com.digitaltwin.digital_twin_backend.model.Medication;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.EmergencyAlertRepository;
import com.digitaltwin.digital_twin_backend.repository.MedicationRepository;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import com.digitaltwin.digital_twin_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MedicationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(MedicationScheduler.class);

    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmergencyAlertRepository emergencyAlertRepository;

    /**
     * Runs every 60 seconds.
     * Two jobs in one pass:
     * 1. Remind patient if medication is due in next 15 minutes
     * 2. Alert caregivers if medication was missed 30 minutes ago
     */
    @Scheduled(fixedRate = 10000)
    public void checkMedications() {
        logger.debug("⏰ Scheduler tick — checking medications");

        List<Medication> activeMedications = medicationRepository.findByActiveTrue();
        logger.info("💊 Found {} active medication(s) in DB", activeMedications.size());
        if (activeMedications.isEmpty()) {
            logger.debug("No active medications found");
            return;
        }

        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        String todayDayOfWeek = LocalDate.now().getDayOfWeek().name();

        for (Medication medication : activeMedications) {

            // ✅ Log what scheduler sees for each medication
            logger.info("🔍 Checking medication: {} | UserId: {} | ScheduledTimes: {} | Active: {}",
                    medication.getName(),
                    medication.getUserId(),
                    medication.getScheduledTimes(),
                    medication.isActive());

            if (medication.getScheduledTimes() == null || medication.getScheduledTimes().isEmpty()) {
                logger.warn("⚠️ Medication '{}' has NO scheduled times — skipping", medication.getName());
                continue;
            }

            if (!isScheduledToday(medication, todayDayOfWeek)) {
                logger.info("📅 Medication '{}' not scheduled for today ({})",
                        medication.getName(), todayDayOfWeek);
                continue;
            }

            // ✅ Check patient has phone/email before processing
            userRepository.findById(medication.getUserId()).ifPresentOrElse(
                    patient -> {
                        if ((patient.getPhoneNumber() == null || patient.getPhoneNumber().isBlank()) &&
                                (patient.getEmail() == null || patient.getEmail().isBlank())) {
                            logger.warn(
                                    "⚠️ Patient '{}' has NO phone number AND NO email — notifications will not be sent!",
                                    patient.getFullName());
                        }
                    },
                    () -> logger.error("❌ Patient not found for userId: {}", medication.getUserId()));

            for (LocalTime scheduledTime : medication.getScheduledTimes()) {
                logger.info("⏱ Now: {} | ScheduledTime: {} | ReminderAt: {} | MissedAt: {}",
                        now,
                        scheduledTime,
                        scheduledTime.minusMinutes(medication.getReminderMinutesBefore()),
                        scheduledTime.plusMinutes(2));

                checkReminder(medication, scheduledTime, now);
                checkMissed(medication, scheduledTime, now);
            }
        }
    }

    /**
     * Send reminder to patient if medication is due within next 15 minutes
     */
    private void checkReminder(Medication medication, LocalTime scheduledTime, LocalTime now) {
        int reminderBefore = medication.getReminderMinutesBefore(); // default 15
        LocalTime reminderTime = scheduledTime.minusMinutes(reminderBefore);

        // Check if now is within the reminder window (±1 minute tolerance)
        if (isWithinOneMinute(now, reminderTime)) {
            // Don't remind if already taken
            if (isTakenToday(medication, scheduledTime))
                return;

            logger.info("💊 Sending reminder — Medication: {}, Patient: {}, Due at: {}",
                    medication.getName(), medication.getUserId(), scheduledTime);

            userRepository.findById(medication.getUserId()).ifPresent(patient -> {
                // SMS reminder to patient
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendMedicationReminder(
                            patient.getPhoneNumber(),
                            medication.getName(),
                            medication.getDosage());
                }

                // Email reminder to patient
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendMedicationReminderEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            medication.getName(),
                            medication.getDosage());
                }
            });
        }
    }

    /**
     * Alert caregivers if medication was missed 30 minutes ago
     */
    private void checkMissed(Medication medication, LocalTime scheduledTime, LocalTime now) {
        LocalTime missedThreshold = scheduledTime.plusMinutes(2);
        if (isWithinOneMinute(now, missedThreshold)) {
            // Already taken — no alert needed
            if (isTakenToday(medication, scheduledTime))
                return;

            // Already alerted for this — avoid duplicate alerts
            if (alertAlreadyCreated(medication, scheduledTime))
                return;

            logger.warn("🚨 Missed medication detected — {}, Patient: {}, Was due at: {}",
                    medication.getName(), medication.getUserId(), scheduledTime);

            userRepository.findById(medication.getUserId()).ifPresent(patient -> {
                // Create emergency alert
                createMissedAlert(patient, medication, scheduledTime);
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendMissedMedicationEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            patient.getFullName(),
                            medication.getName(),
                            medication.getDosage(),
                            scheduledTime.toString()
                    );
                }
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendSMS(
                            patient.getPhoneNumber(),
                            String.format("🚨 You missed your medication: %s (%s) scheduled at %s. Please take it now!",
                                    medication.getName(), medication.getDosage(), scheduledTime)
                    );
                }
                // Notify all caregivers
                notifyCaregivers(patient, medication, scheduledTime);
            });
        }
    }

    /**
     * Create MEDICATION_MISSED emergency alert in DB
     */
    private void createMissedAlert(User patient, Medication medication, LocalTime scheduledTime) {
        EmergencyAlert alert = new EmergencyAlert();
        alert.setPatientId(patient.getId());
        alert.setPatientName(patient.getFullName());
        alert.setAlertType(EmergencyAlert.AlertType.MEDICATION_MISSED);
        alert.setSeverity(EmergencyAlert.AlertSeverity.HIGH);
        alert.setMessage(String.format("Patient missed %s (%s) scheduled at %s",
                medication.getName(), medication.getDosage(), scheduledTime));
        alert.setStatus(EmergencyAlert.AlertStatus.ACTIVE);
        alert.setNotifiedCaregiverIds(patient.getCaregiverIds());
        alert.setCreatedAt(LocalDateTime.now());

        emergencyAlertRepository.save(alert);
        logger.info("✅ Emergency alert created for missed medication: {}", medication.getName());
    }

    /**
     * Notify all caregivers via SMS + Email
     */
    private void notifyCaregivers(User patient, Medication medication, LocalTime scheduledTime) {
        if (patient.getCaregiverIds() == null || patient.getCaregiverIds().isEmpty()) {
            logger.warn("⚠️ No caregivers for patient: {}", patient.getFullName());
            return;
        }

        for (String caregiverId : patient.getCaregiverIds()) {
            userRepository.findById(caregiverId).ifPresent(caregiver -> {

                // SMS to caregiver
                if (caregiver.getPhoneNumber() != null && !caregiver.getPhoneNumber().isBlank()) {
                    notificationService.sendSMS(
                            caregiver.getPhoneNumber(),
                            String.format(
                                    "🚨 MISSED MEDICATION\nPatient: %s\nMedication: %s (%s)\nWas due at: %s\nPlease follow up!",
                                    patient.getFullName(), medication.getName(),
                                    medication.getDosage(), scheduledTime));
                }

                // Email to caregiver
                if (caregiver.getEmail() != null && !caregiver.getEmail().isBlank()) {
                    notificationService.sendMissedMedicationEmail(
                            caregiver.getEmail(),
                            caregiver.getFullName(),
                            patient.getFullName(),
                            medication.getName(),
                            medication.getDosage(),
                            scheduledTime.toString());
                }
            });
        }
    }

    // ==================== HELPERS ====================

    /**
     * Check if medication is scheduled for today based on daysOfWeek
     * If daysOfWeek is empty — assume daily
     */
    private boolean isScheduledToday(Medication medication, String todayDayOfWeek) {
        if (medication.getDaysOfWeek() == null || medication.getDaysOfWeek().isEmpty()) {
            return true; // No restriction = daily
        }
        return medication.getDaysOfWeek().stream()
                .anyMatch(day -> day.equalsIgnoreCase(todayDayOfWeek));
    }

    /**
     * Check if medication was already taken today at this scheduled time
     */
    private boolean isTakenToday(Medication medication, LocalTime scheduledTime) {
        if (medication.getLogs() == null || medication.getLogs().isEmpty())
            return false;

        LocalDate today = LocalDate.now();
        return medication.getLogs().stream().anyMatch(log -> log.getStatus() == Medication.MedicationStatus.TAKEN
                && log.getScheduledTime() != null
                && log.getScheduledTime().toLocalDate().equals(today)
                && log.getScheduledTime().toLocalTime().equals(scheduledTime));
    }

    /**
     * Avoid creating duplicate missed alerts for same medication + same time today
     */
    private boolean alertAlreadyCreated(Medication medication, LocalTime scheduledTime) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<EmergencyAlert> existing = emergencyAlertRepository
                .findByPatientIdAndAlertTypeAndCreatedAtBetween(
                        medication.getUserId(),
                        EmergencyAlert.AlertType.MEDICATION_MISSED,
                        startOfDay,
                        endOfDay);

        return existing.stream().anyMatch(alert -> alert.getMessage() != null &&
                alert.getMessage().contains(medication.getName()) &&
                alert.getMessage().contains(scheduledTime.toString()));
    }

    /**
     * Check if two times are within 1 minute of each other
     * Handles scheduler drift gracefully
     */
    private boolean isWithinOneMinute(LocalTime now, LocalTime target) {
        long diff = Math.abs(now.toSecondOfDay() - target.toSecondOfDay());
        return diff <= 60;
    }
}