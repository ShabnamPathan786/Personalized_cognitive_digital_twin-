package com.digitaltwin.digital_twin_backend.controller;



import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionService connectionService;

    /**
     * Caregiver apne linked patients ko fetch karega
     */
    @GetMapping("/my-patients")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getMyPatients(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        List<UserDTO> patients = connectionService.getLinkedPatients(userDetails.getId());

        return ResponseEntity.ok(ApiResponse.success("Linked patients fetched", patients));
    }

    /**
     * Optional: Patient apne caregivers ko fetch kar sakta hai
     */
    @GetMapping("/my-caregivers")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getMyCaregivers(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        List<UserDTO> caregivers = connectionService.getLinkedCaregivers(userDetails.getId());

        return ResponseEntity.ok(ApiResponse.success("Linked caregivers fetched", caregivers));
    }
}