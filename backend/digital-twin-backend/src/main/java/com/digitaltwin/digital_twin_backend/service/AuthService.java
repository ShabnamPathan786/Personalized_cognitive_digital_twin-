package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.RegisterRequest;
import com.digitaltwin.digital_twin_backend.dto.UserDTO;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Authentication Service
 * Handles user registration and authentication business logic
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    /**
     * Register a new user
     */
    public UserDTO registerUser(RegisterRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setUserType(request.getUserType());
        user.setActive(true);
        user.setEmailVerified(false);
        user.setPhoneVerified(false);

        // Initialize preferences
        User.UserPreferences preferences = new User.UserPreferences();
        user.setPreferences(preferences);

        // Save user
        User savedUser = userRepository.save(user);

        // Return UserDTO (without password)
        return new UserDTO(savedUser);
    }

    /**
     * Authenticate user (Login)
     */
    public Authentication authenticateUser(String usernameOrEmail, String password) {
        // Create authentication token
        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(usernameOrEmail, password);

        // Authenticate
        Authentication authentication = authenticationManager.authenticate(authToken);

        // Set authentication in security context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Update last login time
        updateLastLogin(usernameOrEmail);

        return authentication;
    }

    /**
     * Verify user credentials (manual check)
     */
    public boolean verifyCredentials(String usernameOrEmail, String password) {
        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElse(null);

        if (user == null || !user.isActive()) {
            return false;
        }

        return passwordEncoder.matches(password, user.getPassword());
    }

    /**
     * Update last login time
     */
    public void updateLastLogin(String usernameOrEmail) {
        userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail).ifPresent(user -> {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    /**
     * Get user by username
     */
    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserDTO(user);
    }

    /**
     * Get user by username or email
     */
    public UserDTO getUserByUsernameOrEmail(String usernameOrEmail) {
        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserDTO(user);
    }

    /**
     * Get user by ID
     */
    public UserDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserDTO(user);
    }

    /**
     * Update user profile
     */
    public UserDTO updateUserProfile(String userId, User updatedUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update allowed fields
        if (updatedUser.getFullName() != null) {
            user.setFullName(updatedUser.getFullName());
        }
        if (updatedUser.getPhoneNumber() != null) {
            user.setPhoneNumber(updatedUser.getPhoneNumber());
        }
        if (updatedUser.getProfilePictureUrl() != null) {
            user.setProfilePictureUrl(updatedUser.getProfilePictureUrl());
        }
        if (updatedUser.getPreferences() != null) {
            user.setPreferences(updatedUser.getPreferences());
        }
        if (updatedUser.getEmergencyContacts() != null) {
            user.setEmergencyContacts(updatedUser.getEmergencyContacts());
        }

        User saved = userRepository.save(user);
        return new UserDTO(saved);
    }

    /**
     * Change password
     */
    public boolean changePassword(String userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify old password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return true;
    }

    /**
     * Deactivate account
     */
    public boolean deactivateAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(false);
        userRepository.save(user);

        return true;
    }
}