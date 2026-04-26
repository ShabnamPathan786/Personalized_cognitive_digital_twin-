package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.RoutineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Routine Controller
 * REST API for routine management
 */
@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @PostMapping
    public ResponseEntity<ApiResponse<Routine>> createRoutine(
            @RequestBody Routine routine,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            routine.setUserId(userDetails.getId());

            Routine created = routineService.createRoutine(routine);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Routine created successfully", created));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create routine: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Routine>>> getUserRoutines(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Routine> routines = routineService.getUserRoutines(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("Routines retrieved successfully", routines));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve routines: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Routine>> getRoutineById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Routine routine = routineService.getRoutineById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!routine.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            return ResponseEntity.ok(ApiResponse.success("Routine retrieved", routine));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Routine>> updateRoutine(
            @PathVariable String id,
            @RequestBody Routine routine,
            Authentication authentication) {
        try {
            Routine existing = routineService.getRoutineById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!existing.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Routine updated = routineService.updateRoutine(id, routine);
            return ResponseEntity.ok(ApiResponse.success("Routine updated", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoutine(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Routine routine = routineService.getRoutineById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!routine.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            routineService.deleteRoutine(id);
            return ResponseEntity.ok(ApiResponse.success("Routine deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/seed")
    public ResponseEntity<ApiResponse<List<Routine>>> seedDummyData(
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Routine> seededRoutines = routineService.seedDummyData(userDetails.getId());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Dummy routines seeded successfully", seededRoutines));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to seed dummy routines: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/log-completed")
    public ResponseEntity<ApiResponse<Routine>> logRoutineCompleted(
            @PathVariable String id,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Routine updated = routineService.logRoutineCompleted(id, userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Routine logged as completed", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
