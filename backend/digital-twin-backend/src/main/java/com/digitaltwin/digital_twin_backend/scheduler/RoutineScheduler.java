package com.digitaltwin.digital_twin_backend.scheduler;

import com.digitaltwin.digital_twin_backend.model.EmergencyAlert;
import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.EmergencyAlertRepository;
import com.digitaltwin.digital_twin_backend.repository.RoutineRepository;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import com.digitaltwin.digital_twin_backend.service.NotificationService;
import com.digitaltwin.digital_twin_backend.service.RoutineService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RoutineScheduler {

    private static final Logger logger = LoggerFactory.getLogger(RoutineScheduler.class);
    private static final int MISSED_ROUTINE_GRACE_MINUTES = 3;

    private final RoutineRepository routineRepository;
    private final RoutineService routineService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmergencyAlertRepository emergencyAlertRepository;

    /**
     * Runs every 60 seconds.
     * 1. Remind patient before a scheduled routine
     * 2. Alert caregivers if a routine was not marked done within the grace period
     */
    @Scheduled(fixedRate = 60000)
    public void checkRoutines() {
        logger.debug("📅 Scheduler tick — checking routines");

        List<Routine> activeRoutines = routineRepository.findByActiveTrue();
        if (activeRoutines.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        List<LocalDate> candidateDates = Arrays.asList(now.toLocalDate(), now.toLocalDate().minusDays(1));

        for (Routine routine : activeRoutines) {
            if (routine.getScheduledTime() == null) {
                continue;
            }

            // Only process reminders/alerts for routines that have reminderEnabled=true
            if (!routine.isReminderEnabled()) {
                continue;
            }

            for (LocalDate scheduledDate : candidateDates) {
                if (!isScheduledOnDate(routine, scheduledDate)) {
                    continue;
                }

                LocalDateTime scheduledDateTime = LocalDateTime.of(scheduledDate, routine.getScheduledTime());
                checkReminder(routine, scheduledDateTime, now);
                checkMissed(routine, scheduledDateTime, now);
            }
        }
    }

    private void checkReminder(Routine routine, LocalDateTime scheduledDateTime, LocalDateTime now) {
        int reminderBefore = routine.getReminderMinutesBefore(); // default 15
        LocalDateTime reminderTime = scheduledDateTime.minusMinutes(reminderBefore);

        if (!now.isBefore(reminderTime) && now.isBefore(scheduledDateTime)) {
            // Don't remind if already completed
            if (isCompletedForSchedule(routine, scheduledDateTime))
                return;

            // Don't send the same reminder every scheduler tick
            if (reminderAlreadySent(routine, scheduledDateTime))
                return;

            logger.info("📅 Sending routine reminder — Activity: {}, Patient: {}, Due at: {}",
                    routine.getActivityName(), routine.getUserId(), scheduledDateTime.toLocalTime());

            routineService.logRoutineReminderSent(routine.getId(), scheduledDateTime);

            userRepository.findById(routine.getUserId()).ifPresent(patient -> {
                // SMS reminder to patient
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendRoutineReminder(
                            patient.getPhoneNumber(),
                            routine.getActivityName(),
                            scheduledDateTime.toLocalTime().toString());
                }

                // Email reminder to patient
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendRoutineReminderEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            routine.getActivityName(),
                            scheduledDateTime.toLocalTime().toString());
                }

                // SMS reminder to caregiver(s)
                if (patient.getCaregiverIds() != null && !patient.getCaregiverIds().isEmpty()) {
                    for (String caregiverId : patient.getCaregiverIds()) {
                        userRepository.findById(caregiverId).ifPresent(caregiver -> {
                            if (caregiver.getPhoneNumber() != null && !caregiver.getPhoneNumber().isBlank()) {
                                notificationService.sendSMS(
                                        caregiver.getPhoneNumber(),
                                        String.format("Reminder: Patient %s has a routine '%s' scheduled at %s.", 
                                                patient.getFullName(), routine.getActivityName(), scheduledDateTime.toLocalTime()));
                            }
                        });
                    }
                }
                
                // SMS reminder to emergency contacts as well, if any
                if (patient.getEmergencyContacts() != null && !patient.getEmergencyContacts().isEmpty()) {
                    for (User.EmergencyContact contact : patient.getEmergencyContacts()) {
                        if (contact.getPhoneNumber() != null && !contact.getPhoneNumber().isBlank()) {
                            notificationService.sendSMS(
                                    contact.getPhoneNumber(),
                                    String.format("Reminder: Patient %s has a routine '%s' scheduled at %s.", 
                                            patient.getFullName(), routine.getActivityName(), scheduledDateTime.toLocalTime()));
                        }
                    }
                }
            });
        }
    }

    private void checkMissed(Routine routine, LocalDateTime scheduledDateTime, LocalDateTime now) {
        // Give the patient a short grace period after the scheduled start time.
        LocalDateTime missedThreshold = scheduledDateTime.plusMinutes(MISSED_ROUTINE_GRACE_MINUTES);
        if (!missedThreshold.toLocalDate().equals(now.toLocalDate())) {
            return;
        }

        if (!now.isBefore(missedThreshold)) {
            // Already taken/completed — no alert needed
            if (isCompletedForSchedule(routine, scheduledDateTime))
                return;

            // Already alerted for this — avoid duplicate alerts
            if (alertAlreadyCreated(routine, scheduledDateTime))
                return;

            logger.warn("🚨 Missed routine detected — {}, Patient: {}, Was due at: {}",
                    routine.getActivityName(), routine.getUserId(), scheduledDateTime.toLocalTime());

            // Log it internally as MISSED
            routineService.logRoutineMissed(routine.getId(), scheduledDateTime);

            userRepository.findById(routine.getUserId()).ifPresent(patient -> {
                // Create emergency alert
                createMissedAlert(patient, routine, scheduledDateTime.toLocalTime());
                
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendMissedRoutineEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            patient.getFullName(),
                            routine.getActivityName(),
                            scheduledDateTime.toLocalTime().toString()
                    );
                }
                
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendSMS(
                            patient.getPhoneNumber(),
                            String.format("🚨 You missed an important routine: %s scheduled at %s. Please complete it!",
                                    routine.getActivityName(), scheduledDateTime.toLocalTime())
                    );
                }
                
                // Notify all caregivers
                notifyCaregivers(patient, routine, scheduledDateTime.toLocalTime());
            });
        }
    }

    private void createMissedAlert(User patient, Routine routine, LocalTime scheduledTime) {
        EmergencyAlert alert = new EmergencyAlert();
        alert.setPatientId(patient.getId());
        alert.setPatientName(patient.getFullName());
        alert.setAlertType(EmergencyAlert.AlertType.ROUTINE_MISSED);
        alert.setSeverity(EmergencyAlert.AlertSeverity.MEDIUM);
        alert.setMessage(String.format("Patient missed important routine %s scheduled at %s",
                routine.getActivityName(), scheduledTime));
        alert.setStatus(EmergencyAlert.AlertStatus.ACTIVE);
        alert.setNotifiedCaregiverIds(patient.getCaregiverIds());
        alert.setCreatedAt(LocalDateTime.now());

        emergencyAlertRepository.save(alert);
        logger.info("✅ Emergency alert created for missed routine: {}", routine.getActivityName());
    }

    private void notifyCaregivers(User patient, Routine routine, LocalTime scheduledTime) {
        if (patient.getCaregiverIds() == null || patient.getCaregiverIds().isEmpty()) {
            return;
        }

        for (String caregiverId : patient.getCaregiverIds()) {
            userRepository.findById(caregiverId).ifPresent(caregiver -> {

                // SMS to caregiver
                if (caregiver.getPhoneNumber() != null && !caregiver.getPhoneNumber().isBlank()) {
                    notificationService.sendSMS(
                            caregiver.getPhoneNumber(),
                            String.format(
                                    "🚨 MISSED ROUTINE\nPatient: %s\nActivity: %s\nWas due at: %s\nPlease follow up!",
                                    patient.getFullName(), routine.getActivityName(), scheduledTime));
                }

                // Email to caregiver
                if (caregiver.getEmail() != null && !caregiver.getEmail().isBlank()) {
                    notificationService.sendMissedRoutineEmail(
                            caregiver.getEmail(),
                            caregiver.getFullName(),
                            patient.getFullName(),
                            routine.getActivityName(),
                            scheduledTime.toString());
                }
            });
        }
    }

    private boolean isScheduledOnDate(Routine routine, LocalDate date) {
        if (routine.getDaysOfWeek() == null || routine.getDaysOfWeek().isEmpty()) {
            return true; // No restriction = daily
        }
        String dayOfWeek = date.getDayOfWeek().name();
        return routine.getDaysOfWeek().stream()
                .anyMatch(day -> day.equalsIgnoreCase(dayOfWeek));
    }

    private boolean isCompletedForSchedule(Routine routine, LocalDateTime scheduledDateTime) {
        if (routine.getLogs() == null || routine.getLogs().isEmpty())
            return false;

        return routine.getLogs().stream().anyMatch(log -> 
                (log.getStatus() == Routine.RoutineStatus.COMPLETED || log.getStatus() == Routine.RoutineStatus.SKIPPED)
                && log.getScheduledDateTime() != null
                && log.getScheduledDateTime().toLocalDate().equals(scheduledDateTime.toLocalDate()));
    }

    private boolean reminderAlreadySent(Routine routine, LocalDateTime scheduledDateTime) {
        if (routine.getLogs() == null || routine.getLogs().isEmpty())
            return false;

        return routine.getLogs().stream().anyMatch(log ->
                log.getStatus() == Routine.RoutineStatus.PENDING
                && "Reminder sent by scheduler".equals(log.getNotes())
                && log.getScheduledDateTime() != null
                && log.getScheduledDateTime().equals(scheduledDateTime));
    }

    private boolean alertAlreadyCreated(Routine routine, LocalDateTime scheduledDateTime) {
        LocalDateTime startOfDay = scheduledDateTime.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<EmergencyAlert> existing = emergencyAlertRepository
                .findByPatientIdAndAlertTypeAndCreatedAtBetween(
                        routine.getUserId(),
                        EmergencyAlert.AlertType.ROUTINE_MISSED,
                        startOfDay,
                        endOfDay);

        return existing.stream().anyMatch(alert -> alert.getMessage() != null &&
                alert.getMessage().contains(routine.getActivityName()) &&
                alert.getMessage().contains(scheduledDateTime.toLocalTime().toString()));
    }
}
