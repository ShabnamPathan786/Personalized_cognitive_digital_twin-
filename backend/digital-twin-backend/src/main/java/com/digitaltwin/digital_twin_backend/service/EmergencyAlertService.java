package com.digitaltwin.digital_twin_backend.service;


import com.digitaltwin.digital_twin_backend.model.EmergencyAlert;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.EmergencyAlertRepository;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Emergency Alert Service
 * Manages emergency alerts for dementia patients
 * FIXED:
 *   1. Emergency contacts ko bhi SMS jaata hai (pehle sirf caregivers ko jaata tha)
 *   2. Location raw coordinates ki jagah Google Maps link format mein SMS mein aata hai
 */
@Service
@RequiredArgsConstructor
public class EmergencyAlertService {

    private static final Logger logger = LoggerFactory.getLogger(EmergencyAlertService.class);

    private final EmergencyAlertRepository emergencyAlertRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Create emergency alert
     * Caregivers + Emergency Contacts dono ko notify karta hai
     */
    public EmergencyAlert createAlert(String patientId, EmergencyAlert.AlertType alertType,
                                      EmergencyAlert.AlertSeverity severity, String message, String location) {

        logger.info("========== SOS TRIGGER DEBUG ==========");
        logger.info("Patient ID received: {}", patientId);
        logger.info("Alert Type: {}", alertType);
        logger.info("Severity: {}", severity);
        logger.info("Message: {}", message);
        logger.info("Location: {}", location);
        logger.info("======================================");

        logger.info("🚨 Creating emergency alert for patient: {}, Type: {}, Severity: {}",
                patientId, alertType, severity);

        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        EmergencyAlert alert = new EmergencyAlert();
        alert.setPatientId(patientId);
        alert.setPatientName(patient.getFullName());
        alert.setAlertType(alertType);
        alert.setSeverity(severity);
        alert.setMessage(message != null && !message.trim().isEmpty() ? message : "Emergency alert triggered");
        alert.setLocation(location != null && !location.trim().isEmpty() ? location : "Location unavailable");
        alert.setStatus(EmergencyAlert.AlertStatus.ACTIVE);
        alert.setCreatedAt(LocalDateTime.now());

        // Caregiver IDs set karo
        List<String> caregiverIds = patient.getCaregiverIds();
        alert.setNotifiedCaregiverIds(caregiverIds);

        logger.info("👥 Found {} caregiver(s) for patient {}: {}",
                caregiverIds.size(), patient.getFullName(), caregiverIds);

        // Alert save karo
        EmergencyAlert savedAlert = emergencyAlertRepository.save(alert);
        logger.info("✅ Alert saved with ID: {}", savedAlert.getId());

        // ─── Step 1: Caregivers ko notify karo ───
        if (caregiverIds.isEmpty()) {
            logger.warn("⚠️ NO CAREGIVERS ASSIGNED TO PATIENT {}! No caregiver notifications sent.",
                    patient.getFullName());
        } else {
            notifyAllCaregivers(savedAlert, caregiverIds);
        }

        // ─── Step 2: Emergency Contacts ko notify karo (NEW FIX) ───
        notifyEmergencyContacts(savedAlert, patient);

        return savedAlert;
    }

    /**
     * Caregivers ko SMS bhejo
     */
    private void notifyAllCaregivers(EmergencyAlert alert, List<String> caregiverIds) {
        logger.info("📢 Starting SMS notification for {} caregiver(s)", caregiverIds.size());

        int smsSuccess = 0;
        int smsFailed = 0;
        int skipped = 0;

        for (String caregiverId : caregiverIds) {
            try {
                User caregiver = userRepository.findById(caregiverId).orElse(null);
                if (caregiver == null) {
                    logger.warn("⚠️ Caregiver ID {} not found — skipping", caregiverId);
                    skipped++;
                    continue;
                }

                logger.info("👤 Caregiver: {} | Phone: {}", caregiver.getFullName(), caregiver.getPhoneNumber());

                if (caregiver.getPhoneNumber() == null || caregiver.getPhoneNumber().isBlank()) {
                    logger.warn("⚠️ No phone number for caregiver {} — SMS skipped", caregiver.getFullName());
                    skipped++;
                    continue;
                }

                boolean sent = notificationService.sendSMS(
                        caregiver.getPhoneNumber(),
                        buildAlertMessage(alert)
                );

                if (sent) {
                    smsSuccess++;
                    logger.info("✅ SMS delivered to caregiver {}", caregiver.getFullName());
                } else {
                    smsFailed++;
                    logger.error("❌ SMS failed for caregiver {} at {}", caregiver.getFullName(), caregiver.getPhoneNumber());
                }

                logNotification(alert, caregiverId, caregiver.getFullName(),
                        EmergencyAlert.NotificationMethod.SMS, sent);

            } catch (Exception e) {
                logger.error("❌ Error notifying caregiver {}: {}", caregiverId, e.getMessage(), e);
                smsFailed++;
            }
        }

        logger.info("📊 Caregiver SMS Summary: {} sent, {} failed, {} skipped", smsSuccess, smsFailed, skipped);
    }

    /**
     * ✅ NEW FIX: Emergency Contacts ko SMS bhejo
     * Pehle yeh method exist hi nahi karta tha — isliye emergency contacts ko koi notification nahi jaati thi
     */
    private void notifyEmergencyContacts(EmergencyAlert alert, User patient) {
        List<User.EmergencyContact> emergencyContacts = patient.getEmergencyContacts();

        if (emergencyContacts == null || emergencyContacts.isEmpty()) {
            logger.warn("⚠️ No emergency contacts found for patient {} — skipping", patient.getFullName());
            return;
        }

        logger.info("📢 Notifying {} emergency contact(s) for patient {}",
                emergencyContacts.size(), patient.getFullName());

        int success = 0;
        int failed = 0;

        for (User.EmergencyContact contact : emergencyContacts) {
            try {
                if (contact.getPhoneNumber() == null || contact.getPhoneNumber().isBlank()) {
                    logger.warn("⚠️ No phone number for emergency contact {} — skipping", contact.getName());
                    continue;
                }

                logger.info("📞 Sending SMS to emergency contact: {} | {}", contact.getName(), contact.getPhoneNumber());

                boolean sent = notificationService.sendSMS(
                        contact.getPhoneNumber(),
                        buildAlertMessage(alert)
                );

                if (sent) {
                    success++;
                    logger.info("✅ SMS sent to emergency contact {}", contact.getName());
                } else {
                    failed++;
                    logger.error("❌ SMS failed for emergency contact {} at {}", contact.getName(), contact.getPhoneNumber());
                }

                // Emergency contacts ke liye alag se log nahi kar rahe kyunki unka caregiverId nahi hota

            } catch (Exception e) {
                logger.error("❌ Error notifying emergency contact {}: {}", contact.getName(), e.getMessage(), e);
                failed++;
            }
        }

        logger.info("📊 Emergency Contact SMS Summary: {} sent, {} failed", success, failed);
    }

    /**
     * ✅ YEH METHOD ADD KIYA - Notification log save karo
     * Pehle yeh method missing tha jiski wajah se error aa raha tha
     */
    private void logNotification(EmergencyAlert alert, String caregiverId, String caregiverName,
                                 EmergencyAlert.NotificationMethod method, boolean delivered) {
        try {
            // Agar notifications list null hai toh nayi banao
            if (alert.getNotifications() == null) {
                alert.setNotifications(new java.util.ArrayList<>());
            }

            EmergencyAlert.NotificationLog log = new EmergencyAlert.NotificationLog();
            log.setCaregiverId(caregiverId);
            log.setCaregiverName(caregiverName);
            log.setMethod(method);
            log.setSentAt(LocalDateTime.now());
            log.setDelivered(delivered);

            alert.getNotifications().add(log);
            emergencyAlertRepository.save(alert);

            logger.debug("📝 Logged notification: {} to {} - Delivered: {}",
                    method, caregiverName, delivered);
        } catch (Exception e) {
            // Logging fail ho bhi gaya to koi baat nahi, main functionality toh kaam karegi
            logger.error("❌ Failed to log notification (non-critical): {}", e.getMessage());
        }
    }

    /**
     * ✅ FIXED: SMS message build karo
     * Location ab Google Maps clickable link format mein aata hai
     * (Frontend se already "https://maps.google.com/?q=lat,lng" format mein aata hai)
     */


    private String buildAlertMessage(EmergencyAlert alert) {
        String location = alert.getLocation();

        // Real-time location Google Maps link hai
        String locationForSMS;
        if (location != null && location.startsWith("https://maps.google.com/?q=")) {
            // Coordinates nikaalo
            String coordinates = location.replace("https://maps.google.com/?q=", "");

            // TinyURL ya apna khud ka short URL service use karo
            // Short URL banao: tinyurl.com/api-create.php?url=...
            String shortUrl = makeShortUrl(location); // Custom method

            locationForSMS = "📍 Live Location: " + shortUrl;
        } else {
            locationForSMS = "📍 Location: " + (location != null ? location : "Unavailable");
        }

        return String.format(
                "🚨 EMERGENCY ALERT 🚨\n" +
                        "Patient: %s\n" +
                        "Type: %s\n" +
                        "%s\n" +
                        "Please respond!",
                alert.getPatientName(),
                alert.getAlertType().toString().replace("_", " "),
                locationForSMS
        );
    }

    // Short URL banane ka method
    private String makeShortUrl(String longUrl) {
        try {
            // TinyURL API - free hai
            String apiUrl = "https://tinyurl.com/api-create.php?url=" +
                    URLEncoder.encode(longUrl, "UTF-8");

            RestTemplate restTemplate = new RestTemplate();
            String shortUrl = restTemplate.getForObject(apiUrl, String.class);
            return shortUrl;
        } catch (Exception e) {
            logger.error("Short URL error: {}", e.getMessage());
            return longUrl; // Fail ho to original URL bhejo
        }
    }

    /**
     * Alert email body build karo (future use)
     */
    private String buildAlertEmailBody(EmergencyAlert alert) {
        return String.format(
                "<h2>Emergency Alert</h2>" +
                        "<p><strong>Patient:</strong> %s</p>" +
                        "<p><strong>Alert Type:</strong> %s</p>" +
                        "<p><strong>Severity:</strong> %s</p>" +
                        "<p><strong>Message:</strong> %s</p>" +
                        "<p><strong>Location:</strong> %s</p>" +
                        "<p><strong>Time:</strong> %s</p>" +
                        "<p>Please respond as soon as possible.</p>",
                alert.getPatientName(),
                alert.getAlertType(),
                alert.getSeverity(),
                alert.getMessage(),
                alert.getLocation() != null ? alert.getLocation() : "Unknown",
                alert.getCreatedAt()
        );
    }

    /**
     * Get alert by ID
     */
    public EmergencyAlert getAlertById(String id) {
        return emergencyAlertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
    }

    /**
     * Get all alerts for patient
     */
    public List<EmergencyAlert> getPatientAlerts(String patientId) {
        return emergencyAlertRepository.findByPatientId(patientId);
    }

    /**
     * Get active alerts for patient
     */
    public List<EmergencyAlert> getActivePatientAlerts(String patientId) {
        return emergencyAlertRepository.findByPatientIdAndStatus(
                patientId, EmergencyAlert.AlertStatus.ACTIVE);
    }

    /**
     * Get alerts for caregiver
     */
    public List<EmergencyAlert> getCaregiverAlerts(String caregiverId) {
        return emergencyAlertRepository.findByNotifiedCaregiverIdsContaining(caregiverId);
    }

    /**
     * Acknowledge alert
     */
    public EmergencyAlert acknowledgeAlert(String alertId, String caregiverId) {
        EmergencyAlert alert = getAlertById(alertId);

        for (EmergencyAlert.NotificationLog log : alert.getNotifications()) {
            if (log.getCaregiverId().equals(caregiverId)) {
                log.setAcknowledgedAt(LocalDateTime.now());
            }
        }

        alert.setStatus(EmergencyAlert.AlertStatus.ACKNOWLEDGED);
        return emergencyAlertRepository.save(alert);
    }

    /**
     * Resolve alert
     */
    public EmergencyAlert resolveAlert(String alertId, String caregiverId, String resolutionNotes) {
        EmergencyAlert alert = getAlertById(alertId);

        alert.setStatus(EmergencyAlert.AlertStatus.RESOLVED);
        alert.setResolvedBy(caregiverId);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNotes(
                resolutionNotes != null && !resolutionNotes.trim().isEmpty()
                        ? resolutionNotes
                        : "No resolution notes provided"
        );

        return emergencyAlertRepository.save(alert);
    }

    /**
     * Mark as false alarm
     */
    public EmergencyAlert markAsFalseAlarm(String alertId, String caregiverId, String notes) {
        EmergencyAlert alert = getAlertById(alertId);

        alert.setStatus(EmergencyAlert.AlertStatus.FALSE_ALARM);
        alert.setResolvedBy(caregiverId);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNotes(
                notes != null && !notes.trim().isEmpty()
                        ? notes
                        : "Marked as false alarm - no notes provided"
        );

        return emergencyAlertRepository.save(alert);
    }

    /**
     * Get all active alerts (for monitoring)
     */
    public List<EmergencyAlert> getAllActiveAlerts() {
        return emergencyAlertRepository.findByStatus(EmergencyAlert.AlertStatus.ACTIVE);
    }

    /**
     * Get alerts by severity
     */
    public List<EmergencyAlert> getAlertsBySeverity(EmergencyAlert.AlertSeverity severity) {
        return emergencyAlertRepository.findBySeverity(severity);
    }
}