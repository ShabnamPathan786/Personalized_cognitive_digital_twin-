package com.digitaltwin.digital_twin_backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

/**
 * Notification Service — SMS ONLY via Twilio.
 * Optimized with E.164 phone number formatting for reliable delivery.
 */
@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.phone.number:}")
    private String twilioPhoneNumber;

    @PostConstruct
    public void initTwilio() {
        if (!twilioAccountSid.isEmpty() && !twilioAuthToken.isEmpty()) {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            logger.info("✅ Twilio initialized successfully");
        } else {
            logger.warn("⚠️ Twilio not configured — add twilio credentials to application.properties");
        }
    }

    /**
     * Formats a phone number to E.164 standard (+[country code][number]).
     * Supports Indian numbers (10-digit, 0-prefixed, 91-prefixed).
     *
     * ✅ FIX: Previously the last-resort branch blindly prepended '+' to any
     * unrecognized format (e.g. "9876543210123" → "+9876543210123"), producing
     * an invalid E.164 number that Twilio would reject silently.
     * Now unrecognized formats throw IllegalArgumentException immediately
     * so the caller knows formatting failed rather than sending to a bad number.
     *
     * @throws IllegalArgumentException if the number cannot be formatted to E.164
     */
    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new IllegalArgumentException("Phone number is null or empty");
        }

        // Keep only digits and leading '+'
        String cleaned = phoneNumber.replaceAll("[^\\d+]", "");

        // Already in E.164 format
        if (cleaned.startsWith("+")) {
            return cleaned;
        }

        // 10-digit Indian number → +91XXXXXXXXXX
        if (cleaned.length() == 10) {
            return "+91" + cleaned;
        }

        // 11-digit with leading 0 → strip 0, add +91
        if (cleaned.length() == 11 && cleaned.startsWith("0")) {
            return "+91" + cleaned.substring(1);
        }

        // 12-digit starting with 91 (Indian STD without +) → +91XXXXXXXXXX
        if (cleaned.length() == 12 && cleaned.startsWith("91")) {
            return "+" + cleaned;
        }

        // ✅ FIX: Reject unrecognized formats instead of blindly prepending '+'
        // Previously: return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
        // This would turn "9876543210123" into "+9876543210123" — an invalid number
        // that Twilio silently rejects, making failures very hard to debug.
        throw new IllegalArgumentException(
                "Unrecognized phone number format: '" + phoneNumber +
                        "'. Expected 10-digit, 0-prefixed 11-digit, 91-prefixed 12-digit, or E.164 (+XX...)."
        );
    }

    /**
     * Send SMS via Twilio with automatic E.164 formatting.
     * @return true if sent successfully, false otherwise
     */
    public boolean sendSMS(String toPhoneNumber, String messageText) {
        if (toPhoneNumber == null || toPhoneNumber.isBlank()) {
            logger.error("❌ Cannot send SMS: recipient phone number is null or empty");
            return false;
        }

        String formattedNumber;
        try {
            formattedNumber = formatPhoneNumber(toPhoneNumber);
        } catch (IllegalArgumentException e) {
            // ✅ FIX: Log the specific formatting failure clearly instead of
            // proceeding with a malformed number
            logger.error("❌ Cannot format phone number '{}': {}", toPhoneNumber, e.getMessage());
            return false;
        }

        logger.info("📱 Attempting to send SMS to: {} (original: {})", formattedNumber, toPhoneNumber);

        try {
            if (twilioAccountSid.isEmpty() || twilioAuthToken.isEmpty()) {
                // Dev mode — log only
                logger.info("📱 [DEV MODE] SMS to {}: {}", formattedNumber, messageText);
                return true;
            }

            Message message = Message.creator(
                    new PhoneNumber(formattedNumber),
                    new PhoneNumber(twilioPhoneNumber),
                    messageText
            ).create();

            logger.info("✅ SMS sent successfully. SID: {}", message.getSid());
            return true;

        } catch (Exception e) {
            logger.error("❌ Twilio Error for {}: {}", formattedNumber, e.getMessage());
            return false;
        }
    }

    public void sendMedicationReminder(String phoneNumber, String medicationName, String dosage) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            logger.warn("⚠️ No phone number — medication SMS skipped");
            return;
        }
        sendSMS(phoneNumber, String.format(
                "Medication Reminder: Time to take %s (%s). Please don't forget!", medicationName, dosage));
    }

    public void sendRoutineReminder(String phoneNumber, String activityName, String time) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            logger.warn("⚠️ No phone number — routine SMS skipped");
            return;
        }
        sendSMS(phoneNumber, String.format(
                "Routine Reminder: Time for %s at %s", activityName, time));
    }
}