package com.digitaltwin.digital_twin_backend.websocket;

import com.digitaltwin.digital_twin_backend.dto.VoiceResponse;
import com.digitaltwin.digital_twin_backend.model.AudioChunk;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.VoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Controller
@RequiredArgsConstructor
public class VoiceWebSocketController {

    private final VoiceService voiceService;
    private final SimpMessageSendingOperations messagingTemplate;

    private final Map<String, VoiceSession> activeSessions = new ConcurrentHashMap<>();

    @MessageMapping("/voice.connect")
    public void connect(Principal principal,
                        @Header("sessionId") String sessionId,
                        SimpMessageHeaderAccessor headerAccessor) {

        try {
            CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
            log.info("✅ Voice WebSocket connected - User: {}, Session: {}", user.getUsername(), sessionId);

            // Store in session attributes
            headerAccessor.getSessionAttributes().put("userId", user.getId());
            headerAccessor.getSessionAttributes().put("userType", user.getUserType().name());
            headerAccessor.getSessionAttributes().put("sessionId", sessionId);
            headerAccessor.getSessionAttributes().put("username", user.getUsername());

            // Create or update session
            VoiceSession session = activeSessions.computeIfAbsent(sessionId, k -> {
                VoiceSession newSession = new VoiceSession();
                newSession.setSessionId(sessionId);
                newSession.setUserId(user.getId());
                newSession.setUserType(user.getUserType().name());
                newSession.setUsername(user.getUsername());
                newSession.setConnectedAt(LocalDateTime.now());
                newSession.setActive(true);
                return newSession;
            });

            // Send connection acknowledgment
            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/voice.connected",
                    VoiceResponse.builder()
                            .status(VoiceResponse.ResponseStatus.SUCCESS)
                            .interactionId(sessionId)
                            .textResponse("Connected to voice service")
                            .timestamp(LocalDateTime.now())
                            .build()
            );

            log.info("Connection acknowledgment sent to user: {}", user.getUsername());

        } catch (Exception e) {
            log.error("❌ Error in connect handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.stream")
    public void handleAudioChunk(@Payload AudioChunk chunk,
                                 Principal principal,
                                 @Header("sessionId") String sessionId) {

        try {
            CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
            log.debug("📥 Received chunk {} for session {}", chunk.getSequenceNumber(), sessionId);

            VoiceSession session = activeSessions.get(sessionId);
            if (session == null) {
                session = new VoiceSession();
                session.setSessionId(sessionId);
                session.setUserId(user.getId());
                session.setUserType(user.getUserType().name());
                session.setUsername(user.getUsername());
                session.setConnectedAt(LocalDateTime.now());
                session.setActive(true);
                activeSessions.put(sessionId, session);
                log.info("Created new session for user: {}", user.getUsername());
            }

            // Check for out-of-order chunks
            if (chunk.getSequenceNumber() != session.getExpectedSequence()) {
                log.warn("⚠️ Out of order chunk - Expected: {}, Got: {}",
                        session.getExpectedSequence(), chunk.getSequenceNumber());

                messagingTemplate.convertAndSendToUser(
                        user.getUsername(),
                        "/queue/voice.retransmit",
                        Map.of(
                                "missingSequence", session.getExpectedSequence(),
                                "lastReceived", Math.max(0, chunk.getSequenceNumber() - 1),
                                "timestamp", System.currentTimeMillis()
                        )
                );
                return;
            }

            // Process the chunk
            voiceService.processAudioChunk(sessionId, user.getId(), chunk);

            // Update session state
            session.setExpectedSequence(chunk.getSequenceNumber() + 1);
            session.setLastChunkReceived(LocalDateTime.now());
            session.setTotalChunks(session.getTotalChunks() + 1);
            session.setTotalBytes(session.getTotalBytes() + chunk.getChunkSizeBytes());

            // Append audio data to buffer
            if (chunk.getData() != null) {
                try {
                    byte[] audioData = java.util.Base64.getDecoder().decode(chunk.getData());
                    session.appendAudio(audioData);
                } catch (IllegalArgumentException e) {
                    log.warn("Failed to decode base64 data for chunk {}", chunk.getSequenceNumber());
                }
            }

            // Send acknowledgment
            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/voice.ack",
                    Map.of(
                            "ack", chunk.getSequenceNumber(),
                            "timestamp", System.currentTimeMillis(),
                            "sessionId", sessionId
                    )
            );

            log.debug("✅ Acknowledged chunk {} for session {}", chunk.getSequenceNumber(), sessionId);

        } catch (Exception e) {
            log.error("❌ Error processing audio chunk: {}", e.getMessage(), e);

            if (principal != null) {
                messagingTemplate.convertAndSendToUser(
                        principal.getName(),
                        "/queue/voice.error",
                        Map.of(
                                "error", "Failed to process audio",
                                "message", e.getMessage(),
                                "timestamp", System.currentTimeMillis()
                        )
                );
            }
        }
    }

    @MessageMapping("/voice.stop")
    public void stopStreaming(Principal principal,
                              @Header("sessionId") String sessionId,
                              @Payload(required = false) Map<String, Object> payload) {

        try {
            CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
            log.info("🛑 Voice streaming stopped - User: {}, Session: {}", user.getUsername(), sessionId);

            VoiceSession session = activeSessions.get(sessionId);
            if (session == null) {
                log.warn("⚠️ No active session found for ID: {}", sessionId);
                return;
            }

            session.setActive(false);
            session.setCompletedAt(LocalDateTime.now());

            String mode = payload != null && payload.containsKey("mode")
                    ? payload.get("mode").toString()
                    : (user.getUserType() == User.UserType.DEMENTIA_PATIENT ? "dementia" : "standard");

            // Process complete voice
            voiceService.processCompleteVoice(
                    sessionId,
                    user.getId(),
                    user.getUserType().name(),
                    mode
            ).thenAccept(response -> {
                try {
                    messagingTemplate.convertAndSendToUser(
                            user.getUsername(),
                            "/queue/voice.response",
                            response
                    );
                    log.info("✅ Voice response sent to user: {}", user.getUsername());
                } catch (Exception e) {
                    log.error("Failed to send response: {}", e.getMessage());
                }
            }).exceptionally(throwable -> {
                log.error("❌ Voice processing failed: {}", throwable.getMessage());
                try {
                    messagingTemplate.convertAndSendToUser(
                            user.getUsername(),
                            "/queue/voice.error",
                            Map.of(
                                    "error", "Processing failed",
                                    "message", throwable.getMessage(),
                                    "timestamp", System.currentTimeMillis()
                            )
                    );
                } catch (Exception e) {
                    log.error("Failed to send error: {}", e.getMessage());
                }
                return null;
            });

        } catch (Exception e) {
            log.error("❌ Error in stop handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.ping")
    public void handlePing(Principal principal,
                           @Header("sessionId") String sessionId) {
        log.debug("🏓 Ping received from session: {}", sessionId);

        if (principal != null) {
            try {
                messagingTemplate.convertAndSendToUser(
                        principal.getName(),
                        "/queue/voice.pong",
                        Map.of(
                                "pong", true,
                                "sessionId", sessionId,
                                "timestamp", System.currentTimeMillis()
                        )
                );
            } catch (Exception e) {
                log.debug("Failed to send pong: {}", e.getMessage());
            }
        }
    }

    @MessageMapping("/voice.cancel")
    public void cancelProcessing(Principal principal,
                                 @Header("sessionId") String sessionId) {

        try {
            CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
            log.info("❌ Voice processing cancelled - User: {}, Session: {}", user.getUsername(), sessionId);

            VoiceSession session = activeSessions.remove(sessionId);
            if (session != null) {
                session.setActive(false);
                session.setDisconnectedAt(LocalDateTime.now());
                voiceService.cancelProcessing(sessionId);
            }

            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/voice.cancelled",
                    Map.of(
                            "message", "Processing cancelled",
                            "sessionId", sessionId,
                            "timestamp", System.currentTimeMillis()
                    )
            );

        } catch (Exception e) {
            log.error("❌ Error in cancel handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.disconnect")
    public void disconnect(Principal principal,
                           @Header("sessionId") String sessionId) {

        try {
            String username = "unknown";
            if (principal != null) {
                CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
                username = user.getUsername();
                log.info("🔌 Voice WebSocket disconnected - User: {}, Session: {}", username, sessionId);
            }

            VoiceSession session = activeSessions.remove(sessionId);
            if (session != null) {
                session.setActive(false);
                session.setDisconnectedAt(LocalDateTime.now());
                voiceService.cancelProcessing(sessionId);
                log.info("Session {} removed from active sessions", sessionId);
            }

        } catch (Exception e) {
            log.error("❌ Error in disconnect handler: {}", e.getMessage(), e);
        }
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = sha.getSessionId();
        log.info("🔌 STOMP session connected: {}", sessionId);
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = sha.getSessionId();

        // Get username from session if available
        String username = "unknown";
        if (sha.getUser() != null) {
            username = sha.getUser().getName();
        }

        log.info("🔌 STOMP session disconnected - Session: {}, User: {}", sessionId, username);

        // Clean up session
        VoiceSession session = activeSessions.remove(sessionId);
        if (session != null) {
            session.setActive(false);
            session.setDisconnectedAt(LocalDateTime.now());
            voiceService.cancelProcessing(sessionId);
            log.info("Session {} cleaned up on disconnect", sessionId);
        }
    }

    @MessageExceptionHandler
    @SendToUser("/queue/voice.errors")
    public String handleException(Throwable exception, Principal principal) {
        log.error("❌ WebSocket error for user {}: {}",
                principal != null ? principal.getName() : "unknown",
                exception.getMessage(), exception);

        return "Error: " + exception.getMessage();
    }

    public static class VoiceSession {

        private static final org.slf4j.Logger log =
                org.slf4j.LoggerFactory.getLogger(VoiceSession.class);

        private String sessionId;
        private String userId;
        private String userType;
        private String username;
        private boolean active;
        private int expectedSequence = 0;
        private int totalChunks = 0;
        private long totalBytes = 0;
        private LocalDateTime connectedAt;
        private LocalDateTime lastChunkReceived;
        private LocalDateTime completedAt;
        private LocalDateTime disconnectedAt;
        private String interactionId;
        private boolean processing = false;
        private java.io.ByteArrayOutputStream audioBuffer = new java.io.ByteArrayOutputStream();

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getUserType() { return userType; }
        public void setUserType(String userType) { this.userType = userType; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }

        public int getExpectedSequence() { return expectedSequence; }
        public void setExpectedSequence(int expectedSequence) { this.expectedSequence = expectedSequence; }

        public int getTotalChunks() { return totalChunks; }
        public void setTotalChunks(int totalChunks) { this.totalChunks = totalChunks; }

        public long getTotalBytes() { return totalBytes; }
        public void setTotalBytes(long totalBytes) { this.totalBytes = totalBytes; }

        public LocalDateTime getConnectedAt() { return connectedAt; }
        public void setConnectedAt(LocalDateTime connectedAt) { this.connectedAt = connectedAt; }

        public LocalDateTime getLastChunkReceived() { return lastChunkReceived; }
        public void setLastChunkReceived(LocalDateTime lastChunkReceived) { this.lastChunkReceived = lastChunkReceived; }

        public LocalDateTime getCompletedAt() { return completedAt; }
        public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

        public LocalDateTime getDisconnectedAt() { return disconnectedAt; }
        public void setDisconnectedAt(LocalDateTime disconnectedAt) { this.disconnectedAt = disconnectedAt; }

        public String getInteractionId() { return interactionId; }
        public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

        public boolean isProcessing() { return processing; }
        public void setProcessing(boolean processing) { this.processing = processing; }

        public java.io.ByteArrayOutputStream getAudioBuffer() { return audioBuffer; }

        public void appendAudio(byte[] data) {
            try {
                if (data != null && data.length > 0) {
                    audioBuffer.write(data);
                }
            } catch (Exception e) {
                log.error("Failed to append audio", e);
            }
        }

        public byte[] getAudioData() { return audioBuffer.toByteArray(); }
        public void resetBuffer() { audioBuffer.reset(); }
    }
}