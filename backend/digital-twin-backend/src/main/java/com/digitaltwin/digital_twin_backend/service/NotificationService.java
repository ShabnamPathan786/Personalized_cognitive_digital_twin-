package com.digitaltwin.digital_twin_backend.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    // ===== Twilio =====
    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.phone.number:}")
    private String twilioPhoneNumber;

    // ===== Email =====
    @Value("${app.email.from:}")
    private String emailFrom;

    private final JavaMailSender mailSender;

    @PostConstruct
    public void initTwilio() {
        if (!twilioAccountSid.isEmpty() && !twilioAuthToken.isEmpty()) {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            logger.info("✅ Twilio initialized successfully");
        } else {
            logger.warn("⚠️ Twilio not configured — SMS will run in DEV MODE");
        }
    }

    // ==================== EMAIL ====================

    /**
     * Send plain HTML email
     */
    public boolean sendEmail(String toEmail, String subject, String htmlBody) {
        if (toEmail == null || toEmail.isBlank()) {
            logger.warn("⚠️ Cannot send email — recipient is empty");
            return false;
        }

        if (emailFrom == null || emailFrom.isBlank()) {
            logger.warn("⚠️ app.email.from not configured — email skipped");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(emailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML

            mailSender.send(message);
            logger.info("✅ Email sent to: {}", toEmail);
            return true;

        } catch (Exception e) {
            logger.error("❌ Email failed to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Send medication reminder email
     */
    public void sendMedicationReminderEmail(String toEmail, String patientName,
                                             String medicationName, String dosage) {
        if (toEmail == null || toEmail.isBlank()) return;

        String subject = "💊 Medication Reminder — " + medicationName;
        String body = String.format("""
                <h2>Medication Reminder</h2>
                <p>Hello %s,</p>
                <p>It's time to take your medication:</p>
                <ul>
                    <li><strong>Medication:</strong> %s</li>
                    <li><strong>Dosage:</strong> %s</li>
                </ul>
                <p>Please take it now and mark it as taken in the app.</p>
                """, patientName, medicationName, dosage);

        sendEmail(toEmail, subject, body);
    }

    /**
     * Send missed medication alert email to caregiver
     */
    public void sendMissedMedicationEmail(String caregiverEmail, String caregiverName,
                                           String patientName, String medicationName,
                                           String dosage, String scheduledTime) {
        if (caregiverEmail == null || caregiverEmail.isBlank()) return;

        String subject = "🚨 Missed Medication Alert — " + patientName;
        String body = String.format("""
                <h2>⚠️ Missed Medication Alert</h2>
                <p>Dear %s,</p>
                <p>Your patient <strong>%s</strong> has missed their medication:</p>
                <ul>
                    <li><strong>Medication:</strong> %s</li>
                    <li><strong>Dosage:</strong> %s</li>
                    <li><strong>Scheduled Time:</strong> %s</li>
                </ul>
                <p>Please follow up immediately.</p>
                """, caregiverName, patientName, medicationName, dosage, scheduledTime);

        sendEmail(caregiverEmail, subject, body);
    }

    // ==================== SMS ====================

    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new IllegalArgumentException("Phone number is null or empty");
        }
        String cleaned = phoneNumber.replaceAll("[^\\d+]", "");
        if (cleaned.startsWith("+")) return cleaned;
        if (cleaned.length() == 10) return "+91" + cleaned;
        if (cleaned.length() == 11 && cleaned.startsWith("0")) return "+91" + cleaned.substring(1);
        if (cleaned.length() == 12 && cleaned.startsWith("91")) return "+" + cleaned;
        throw new IllegalArgumentException("Unrecognized phone number format: " + phoneNumber);
    }

    public boolean sendSMS(String toPhoneNumber, String messageText) {
        if (toPhoneNumber == null || toPhoneNumber.isBlank()) {
            logger.error("❌ Cannot send SMS: phone number is empty");
            return false;
        }

        String formattedNumber;
        try {
            formattedNumber = formatPhoneNumber(toPhoneNumber);
        } catch (IllegalArgumentException e) {
            logger.error("❌ Cannot format phone number '{}': {}", toPhoneNumber, e.getMessage());
            return false;
        }

        try {
            if (twilioAccountSid.isEmpty() || twilioAuthToken.isEmpty()) {
                logger.info("📱 [DEV MODE] SMS to {}: {}", formattedNumber, messageText);
                return true;
            }

            Message message = Message.creator(
                    new PhoneNumber(formattedNumber),
                    new PhoneNumber(twilioPhoneNumber),
                    messageText
            ).create();

            logger.info("✅ SMS sent. SID: {}", message.getSid());
            return true;

        } catch (Exception e) {
            logger.error("❌ Twilio Error for {}: {}", formattedNumber, e.getMessage());
            return false;
        }
    }

    public void sendMedicationReminder(String phoneNumber, String medicationName, String dosage) {
        if (phoneNumber == null || phoneNumber.isBlank()) return;
        sendSMS(phoneNumber, String.format(
                "💊 Reminder: Time to take %s (%s). Please don't forget!", medicationName, dosage));
    }

    public void sendRoutineReminder(String phoneNumber, String activityName, String time) {
        if (phoneNumber == null || phoneNumber.isBlank()) return;
        sendSMS(phoneNumber, String.format(
                "📅 Routine Reminder: Time for %s at %s", activityName, time));
    }
}