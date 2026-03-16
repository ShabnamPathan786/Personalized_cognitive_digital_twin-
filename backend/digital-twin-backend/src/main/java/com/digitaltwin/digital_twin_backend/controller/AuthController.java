package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.dto.RegisterRequest;
import com.digitaltwin.digital_twin_backend.dto.LoginRequest;
import com.digitaltwin.digital_twin_backend.dto.AuthResponse;
import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;


/**
 * Authentication Controller
 * REST API endpoints for user authentication
 */

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;

    /**
     * Register a new user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UserDTO user = authService.registerUser(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User registered successfully", user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Login user (JSON-based)
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsernameOrEmail(),
                            request.getPassword()
                    )
            );

            // Set authentication in security context
            SecurityContext securityContext = SecurityContextHolder.getContext();
            securityContext.setAuthentication(authentication);

            // Create new session
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

            // Update last login time
            authService.updateLastLogin(request.getUsernameOrEmail());

            // Get user details
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            UserDTO user = authService.getUserById(userDetails.getId());

            // Create response using AuthResponse
            AuthResponse response = new AuthResponse(
                    "Login successful",
                    user,
                    session.getId()
            );

            return ResponseEntity.ok(ApiResponse.success("Login successful", response));

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username or password"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(HttpServletRequest request) {
        try {
            // Invalidate session
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }

            // Clear security context
            SecurityContextHolder.clearContext();

            return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Logout failed: " + e.getMessage()));
        }
    }

    /**
     * Get current authenticated user
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Not authenticated"));
            }

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            UserDTO user = authService.getUserById(userDetails.getId());

            return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", user));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving user: " + e.getMessage()));
        }
    }

    /**
     * Update user profile
     * PUT /api/auth/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            User updatedUser = new User();
            updatedUser.setFullName(request.getFullName());
            updatedUser.setPhoneNumber(request.getPhoneNumber());
            updatedUser.setProfilePictureUrl(request.getProfilePictureUrl());

            UserDTO user = authService.updateUserProfile(userDetails.getId(), updatedUser);
            return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Change password
     * POST /api/auth/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            authService.changePassword(
                    userDetails.getId(),
                    request.getOldPassword(),
                    request.getNewPassword()
            );

            return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Deactivate account
     * POST /api/auth/deactivate
     */
    @PostMapping("/deactivate")
    public ResponseEntity<ApiResponse<String>> deactivateAccount(
            Authentication authentication,
            HttpServletRequest request) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            authService.deactivateAccount(userDetails.getId());

            // Logout after deactivation
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();

            return ResponseEntity.ok(ApiResponse.success("Account deactivated successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Check session status
     * GET /api/auth/session
     */
    @GetMapping("/session")
    public ResponseEntity<ApiResponse<SessionInfo>> checkSession(HttpSession session) {
        if (session != null && !session.isNew()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAuthenticated = auth != null && auth.isAuthenticated() &&
                    !auth.getPrincipal().equals("anonymousUser");

            SessionInfo info = new SessionInfo(
                    session.getId(),
                    isAuthenticated,
                    session.getMaxInactiveInterval(),
                    session.getCreationTime(),
                    session.getLastAccessedTime()
            );

            return ResponseEntity.ok(ApiResponse.success("Session active", info));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("No active session"));
    }

    /**
     * Health check endpoint
     * GET /api/auth/health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.success("Auth service is running", "OK"));
    }

    // Inner DTOs (only for profile, password, session - not for login/register/auth)
    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private String phoneNumber;
        private String profilePictureUrl;
    }

    @Data
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
    }

    @Data
    public static class SessionInfo {
        private String sessionId;
        private boolean authenticated;
        private int maxInactiveInterval;
        private long creationTime;
        private long lastAccessedTime;

        public SessionInfo(String sessionId, boolean authenticated, int maxInactiveInterval,
                           long creationTime, long lastAccessedTime) {
            this.sessionId = sessionId;
            this.authenticated = authenticated;
            this.maxInactiveInterval = maxInactiveInterval;
            this.creationTime = creationTime;
            this.lastAccessedTime = lastAccessedTime;
        }
    }
}