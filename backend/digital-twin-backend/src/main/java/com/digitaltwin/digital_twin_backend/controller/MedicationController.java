package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.Medication;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.MedicationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Medication Controller
 * REST API for medication management
 */
@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicationService medicationService;

    /**
     * Create new medication
     * POST /api/medications
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Medication>> createMedication(
            @RequestBody Medication medication,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            medication.setUserId(userDetails.getId());

            Medication created = medicationService.createMedication(medication);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Medication created successfully", created));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create medication: " + e.getMessage()));
        }
    }

    /**
     * Get all medications for current user
     * GET /api/medications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Medication>>> getUserMedications(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Medication> medications = medicationService.getUserMedications(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Medications retrieved successfully", medications));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve medications: " + e.getMessage()));
        }
    }

    /**
     * Get active medications
     * GET /api/medications/active
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Medication>>> getActiveMedications(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Medication> medications = medicationService.getActiveMedications(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Active medications retrieved", medications));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve medications: " + e.getMessage()));
        }
    }

    /**
     * Get medication by ID
     * GET /api/medications/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Medication>> getMedicationById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            // Check if user owns the medication
            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            return ResponseEntity.ok(ApiResponse.success("Medication retrieved", medication));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update medication
     * PUT /api/medications/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Medication>> updateMedication(
            @PathVariable String id,
            @RequestBody Medication medication,
            Authentication authentication) {
        try {
            Medication existing = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!existing.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Medication updated = medicationService.updateMedication(id, medication);
            return ResponseEntity.ok(ApiResponse.success("Medication updated", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Log medication taken
     * POST /api/medications/{id}/log-taken
     */
    @PostMapping("/{id}/log-taken")
    public ResponseEntity<ApiResponse<Medication>> logMedicationTaken(
            @PathVariable String id,
            @RequestBody MedicationLogRequest request,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Medication updated = medicationService.logMedicationTaken(
                    id,
                    request.getScheduledTime(),
                    request.getActualTime() != null ? request.getActualTime() : LocalDateTime.now(),
                    request.getNotes());

            return ResponseEntity.ok(ApiResponse.success("Medication logged as taken", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Log medication missed
     * POST /api/medications/{id}/log-missed
     */
    @PostMapping("/{id}/log-missed")
    public ResponseEntity<ApiResponse<Medication>> logMedicationMissed(
            @PathVariable String id,
            @RequestBody MedicationLogRequest request,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Medication updated = medicationService.logMedicationMissed(
                    id,
                    request.getScheduledTime(),
                    request.getNotes());

            return ResponseEntity.ok(ApiResponse.success("Medication logged as missed", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Deactivate medication
     * PUT /api/medications/{id}/deactivate
     */
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Medication>> deactivateMedication(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Medication updated = medicationService.deactivateMedication(id);
            return ResponseEntity.ok(ApiResponse.success("Medication deactivated", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Delete medication
     * DELETE /api/medications/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMedication(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            medicationService.deleteMedication(id);
            return ResponseEntity.ok(ApiResponse.success("Medication deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @Data
    public static class MedicationLogRequest {
        private LocalDateTime scheduledTime;
        private LocalDateTime actualTime;
        private String notes;
    }

    /**
     * Get upcoming medications for today
     * GET /api/medications/upcoming
     */
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<Medication>>> getUpcomingMedications(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Medication> medications = medicationService.getUpcomingMedications(userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Upcoming medications retrieved", medications));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve upcoming medications: " + e.getMessage()));
        }
    }

    /**
     * Get medication logs
     * GET /api/medications/{id}/logs
     */
    @GetMapping("/{id}/logs")
    public ResponseEntity<ApiResponse<List<Medication.MedicationLog>>> getMedicationLogs(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Medication medication = medicationService.getMedicationById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!medication.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            List<Medication.MedicationLog> logs = medicationService.getMedicationLogs(id);
            return ResponseEntity.ok(ApiResponse.success("Logs retrieved", logs));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}