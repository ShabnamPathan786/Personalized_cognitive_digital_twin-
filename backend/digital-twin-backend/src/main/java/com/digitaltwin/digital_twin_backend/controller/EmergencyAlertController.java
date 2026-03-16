package com.digitaltwin.digital_twin_backend.controller;


import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.EmergencyAlert;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.EmergencyAlertService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Emergency Alert Controller
 * REST API for emergency alerts
 * FIXED: Added input validation and cleaned up comments
 */
@RestController
@RequestMapping("/api/emergency-alerts")
@RequiredArgsConstructor
public class EmergencyAlertController {

    private final EmergencyAlertService emergencyAlertService;

    /**
     * Create emergency alert (SOS button)
     * POST /api/emergency-alerts
     * FIXED: Added validation for required fields
     */
    @PostMapping
    public ResponseEntity<ApiResponse<EmergencyAlert>> createAlert(
            @RequestBody CreateAlertRequest request,
            Authentication authentication) {
        try {
            // Validate required fields
            if (request.getAlertType() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Alert type is required"));
            }

            if (request.getSeverity() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Severity level is required"));
            }

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            EmergencyAlert alert = emergencyAlertService.createAlert(
                    userDetails.getId(),
                    request.getAlertType(),
                    request.getSeverity(),
                    request.getMessage() != null ? request.getMessage() : "Emergency alert triggered",
                    request.getLocation() != null ? request.getLocation() : "Location unavailable"
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Emergency alert created and caregivers notified", alert));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create alert: " + e.getMessage()));
        }
    }

    /**
     * Get all alerts for current user (patient)
     * GET /api/emergency-alerts
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EmergencyAlert>>> getPatientAlerts(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<EmergencyAlert> alerts = emergencyAlertService.getPatientAlerts(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Alerts retrieved successfully", alerts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve alerts: " + e.getMessage()));
        }
    }

    /**
     * Get active alerts for patient
     * GET /api/emergency-alerts/active
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<EmergencyAlert>>> getActiveAlerts(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<EmergencyAlert> alerts = emergencyAlertService.getActivePatientAlerts(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Active alerts retrieved", alerts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve alerts: " + e.getMessage()));
        }
    }

    /**
     * Get alerts for caregiver
     * GET /api/emergency-alerts/caregiver
     */
    @GetMapping("/caregiver")
    public ResponseEntity<ApiResponse<List<EmergencyAlert>>> getCaregiverAlerts(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<EmergencyAlert> alerts = emergencyAlertService.getCaregiverAlerts(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Caregiver alerts retrieved", alerts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve alerts: " + e.getMessage()));
        }
    }

    /**
     * Get alert by ID
     * GET /api/emergency-alerts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmergencyAlert>> getAlertById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            EmergencyAlert alert = emergencyAlertService.getAlertById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check if user is patient or caregiver
            boolean isPatient = alert.getPatientId().equals(userDetails.getId());
            boolean isCaregiver = alert.getNotifiedCaregiverIds().contains(userDetails.getId());

            if (!isPatient && !isCaregiver) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            return ResponseEntity.ok(ApiResponse.success("Alert retrieved", alert));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Acknowledge alert (caregiver saw it)
     * POST /api/emergency-alerts/{id}/acknowledge
     */
    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<EmergencyAlert>> acknowledgeAlert(
            @PathVariable String id,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            EmergencyAlert alert = emergencyAlertService.getAlertById(id);

            // Check if user is a caregiver for this alert
            if (!alert.getNotifiedCaregiverIds().contains(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            EmergencyAlert updated = emergencyAlertService.acknowledgeAlert(id, userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Alert acknowledged", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Resolve alert
     * POST /api/emergency-alerts/{id}/resolve
     * FIXED: Cleaned up comments (removed Hindi/Hinglish)
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<EmergencyAlert>> resolveAlert(
            @PathVariable String id,
            @RequestBody ResolveAlertRequest request,
            Authentication authentication) {
        try {
            // Fetch the alert
            EmergencyAlert alert = emergencyAlertService.getAlertById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check permissions - both patient and caregiver can resolve
            boolean isPatient = alert.getPatientId().equals(userDetails.getId());
            boolean isCaregiver = alert.getNotifiedCaregiverIds().contains(userDetails.getId());

            if (!isPatient && !isCaregiver) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied: You are not authorized to resolve this alert"));
            }

            // Resolve the alert
            EmergencyAlert updated = emergencyAlertService.resolveAlert(
                    id,
                    userDetails.getId(),
                    request.getResolutionNotes()
            );

            return ResponseEntity.ok(ApiResponse.success("Alert resolved successfully", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Mark alert as false alarm
     * POST /api/emergency-alerts/{id}/false-alarm
     */
    @PostMapping("/{id}/false-alarm")
    public ResponseEntity<ApiResponse<EmergencyAlert>> markAsFalseAlarm(
            @PathVariable String id,
            @RequestBody ResolveAlertRequest request,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            EmergencyAlert alert = emergencyAlertService.getAlertById(id);

            // Check if user is a caregiver for this alert
            if (!alert.getNotifiedCaregiverIds().contains(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            EmergencyAlert updated = emergencyAlertService.markAsFalseAlarm(
                    id,
                    userDetails.getId(),
                    request.getResolutionNotes()
            );

            return ResponseEntity.ok(ApiResponse.success("Alert marked as false alarm", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all active alerts (admin/monitoring)
     * GET /api/emergency-alerts/all/active
     */
    @GetMapping("/all/active")
    public ResponseEntity<ApiResponse<List<EmergencyAlert>>> getAllActiveAlerts() {
        try {
            List<EmergencyAlert> alerts = emergencyAlertService.getAllActiveAlerts();
            return ResponseEntity.ok(ApiResponse.success("All active alerts retrieved", alerts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve alerts: " + e.getMessage()));
        }
    }

    @Data
    public static class CreateAlertRequest {
        private EmergencyAlert.AlertType alertType;
        private EmergencyAlert.AlertSeverity severity;
        private String message;
        private String location;
    }

    @Data
    public static class ResolveAlertRequest {
        private String resolutionNotes;
    }
}