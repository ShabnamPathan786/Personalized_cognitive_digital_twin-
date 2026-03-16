package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.dto.ProfileRequest;
import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService profileService;

    @PutMapping("/complete")
    public ResponseEntity<ApiResponse<UserDTO>> completeProfile(
            @RequestBody ProfileRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized"));
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails userDetails)) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Invalid user session"));
        }

        UserDTO updatedUser =
                profileService.completeUserProfile(userDetails.getId(), request);

        return ResponseEntity.ok(
                ApiResponse.success("Profile setup successfully with caregiver!", updatedUser)
        );
    }

}