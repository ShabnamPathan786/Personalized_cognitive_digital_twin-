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
import java.util.List;

@Component
@RequiredArgsConstructor
public class RoutineScheduler {

    private static final Logger logger = LoggerFactory.getLogger(RoutineScheduler.class);

    private final RoutineRepository routineRepository;
    private final RoutineService routineService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmergencyAlertRepository emergencyAlertRepository;

    /**
     * Runs every 60 seconds.
     * 1. Remind patient if an important routine is due in next 15 minutes
     * 2. Alert caregivers if an important routine was missed (15 minutes after start time)
     */
    @Scheduled(fixedRate = 60000)
    public void checkRoutines() {
        logger.debug("📅 Scheduler tick — checking routines");

        List<Routine> activeRoutines = routineRepository.findByActiveTrue();
        if (activeRoutines.isEmpty()) {
            return;
        }

        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        String todayDayOfWeek = LocalDate.now().getDayOfWeek().name();

        for (Routine routine : activeRoutines) {
            if (routine.getScheduledTime() == null) {
                continue;
            }

            if (!isScheduledToday(routine, todayDayOfWeek)) {
                continue;
            }

            // Only process reminders/alerts for routines that have reminderEnabled=true
            if (!routine.isReminderEnabled()) {
                continue;
            }

            LocalTime scheduledTime = routine.getScheduledTime();
            checkReminder(routine, scheduledTime, now);
            checkMissed(routine, scheduledTime, now);
        }
    }

    private void checkReminder(Routine routine, LocalTime scheduledTime, LocalTime now) {
        int reminderBefore = routine.getReminderMinutesBefore(); // default 15
        LocalTime reminderTime = scheduledTime.minusMinutes(reminderBefore);

        // Check if now is within the reminder window (±1 minute tolerance)
        if (isWithinOneMinute(now, reminderTime)) {
            // Don't remind if already completed
            if (isCompletedToday(routine, scheduledTime))
                return;

            logger.info("📅 Sending routine reminder — Activity: {}, Patient: {}, Due at: {}",
                    routine.getActivityName(), routine.getUserId(), scheduledTime);

            userRepository.findById(routine.getUserId()).ifPresent(patient -> {
                // SMS reminder to patient
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendRoutineReminder(
                            patient.getPhoneNumber(),
                            routine.getActivityName(),
                            scheduledTime.toString());
                }

                // Email reminder to patient
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendRoutineReminderEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            routine.getActivityName(),
                            scheduledTime.toString());
                }
            });
        }
    }

    private void checkMissed(Routine routine, LocalTime scheduledTime, LocalTime now) {
        // Checking for missed 15 minutes after the scheduled start time
        LocalTime missedThreshold = scheduledTime.plusMinutes(15);
        if (isWithinOneMinute(now, missedThreshold)) {
            // Already taken/completed — no alert needed
            if (isCompletedToday(routine, scheduledTime))
                return;

            // Already alerted for this — avoid duplicate alerts
            if (alertAlreadyCreated(routine, scheduledTime))
                return;

            logger.warn("🚨 Missed routine detected — {}, Patient: {}, Was due at: {}",
                    routine.getActivityName(), routine.getUserId(), scheduledTime);

            // Log it internally as MISSED
            routineService.logRoutineMissed(routine.getId());

            userRepository.findById(routine.getUserId()).ifPresent(patient -> {
                // Create emergency alert
                createMissedAlert(patient, routine, scheduledTime);
                
                if (patient.getEmail() != null && !patient.getEmail().isBlank()) {
                    notificationService.sendMissedRoutineEmail(
                            patient.getEmail(),
                            patient.getFullName(),
                            patient.getFullName(),
                            routine.getActivityName(),
                            scheduledTime.toString()
                    );
                }
                
                if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isBlank()) {
                    notificationService.sendSMS(
                            patient.getPhoneNumber(),
                            String.format("🚨 You missed an important routine: %s scheduled at %s. Please complete it!",
                                    routine.getActivityName(), scheduledTime)
                    );
                }
                
                // Notify all caregivers
                notifyCaregivers(patient, routine, scheduledTime);
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

    private boolean isScheduledToday(Routine routine, String todayDayOfWeek) {
        if (routine.getDaysOfWeek() == null || routine.getDaysOfWeek().isEmpty()) {
            return true; // No restriction = daily
        }
        return routine.getDaysOfWeek().stream()
                .anyMatch(day -> day.equalsIgnoreCase(todayDayOfWeek));
    }

    private boolean isCompletedToday(Routine routine, LocalTime scheduledTime) {
        if (routine.getLogs() == null || routine.getLogs().isEmpty())
            return false;

        LocalDate today = LocalDate.now();
        return routine.getLogs().stream().anyMatch(log -> 
                (log.getStatus() == Routine.RoutineStatus.COMPLETED || log.getStatus() == Routine.RoutineStatus.SKIPPED)
                && log.getScheduledDateTime() != null
                && log.getScheduledDateTime().toLocalDate().equals(today));
    }

    private boolean alertAlreadyCreated(Routine routine, LocalTime scheduledTime) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<EmergencyAlert> existing = emergencyAlertRepository
                .findByPatientIdAndAlertTypeAndCreatedAtBetween(
                        routine.getUserId(),
                        EmergencyAlert.AlertType.ROUTINE_MISSED,
                        startOfDay,
                        endOfDay);

        return existing.stream().anyMatch(alert -> alert.getMessage() != null &&
                alert.getMessage().contains(routine.getActivityName()) &&
                alert.getMessage().contains(scheduledTime.toString()));
    }

    private boolean isWithinOneMinute(LocalTime now, LocalTime target) {
        long diff = Math.abs(now.toSecondOfDay() - target.toSecondOfDay());
        return diff <= 60;
    }
}
