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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Controller
@RequiredArgsConstructor
public class VoiceWebSocketController {

    private final VoiceService voiceService;
    private final SimpMessageSendingOperations messagingTemplate;
    private final VoiceSessionRegistry voiceSessionRegistry;

    // ✅ REMOVED: These fields don't belong here - moved to VoiceSession inner class
    // private final Map<String, VoiceSession> activeSessions = new
    // ConcurrentHashMap<>();

    // ✅ KEPT ONLY: This is the only field at controller level
    private final Map<String, VoiceSession> activeSessions = new ConcurrentHashMap<>();

    @MessageMapping("/voice.connect")
    public void connect(Principal principal,
            @Header("sessionId") String sessionId,
            @Payload(required = false) Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {

        try {
            VoiceUserContext userContext = resolveUserContext(principal, payload, sessionId, null);
            String userId = userContext.userId();
            String username = userContext.username();
            String userType = userContext.userType();

            log.info("✅ Voice WebSocket connected - User: {}, Type: {}, Session: {}", username, userType, sessionId);

            headerAccessor.getSessionAttributes().put("userId", userId);
            headerAccessor.getSessionAttributes().put("userType", userType);
            headerAccessor.getSessionAttributes().put("sessionId", sessionId);
            headerAccessor.getSessionAttributes().put("username", username);

            VoiceSession session = activeSessions.computeIfAbsent(sessionId, k -> {
                VoiceSession newSession = new VoiceSession();
                newSession.setSessionId(sessionId);
                newSession.setUserId(userId);
                newSession.setUserType(userType);
                newSession.setUsername(username);
                newSession.setConnectedAt(LocalDateTime.now());
                newSession.setActive(true);
                return newSession;
            });

            voiceSessionRegistry.markConnected(sessionId, userId, username, userType);

            if (principal != null) {
                messagingTemplate.convertAndSendToUser(
                        username,
                        "/queue/voice.connected",
                        VoiceResponse.builder()
                                .status(VoiceResponse.ResponseStatus.SUCCESS)
                                .interactionId(sessionId)
                                .textResponse("Connected to voice service")
                                .timestamp(LocalDateTime.now())
                                .build());
                log.info("Connection acknowledgment sent to user: {}", username);
            } else {
                messagingTemplate.convertAndSend(
                        "/topic/voice.connected/" + sessionId,
                        VoiceResponse.builder()
                                .status(VoiceResponse.ResponseStatus.SUCCESS)
                                .interactionId(sessionId)
                                .textResponse("Connected to voice service")
                                .timestamp(LocalDateTime.now())
                                .build());
            }

        } catch (Exception e) {
            log.error("❌ Error in connect handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.stream")
    public void handleAudioChunk(@Payload AudioChunk chunk,
            Principal principal,
            @Header("sessionId") String sessionId) {

        log.info("📥 CHUNK RECEIVED - Session: {}, Seq: {}, Size: {} bytes",
                sessionId, chunk.getSequenceNumber(), chunk.getChunkSizeBytes());

        try {
            String username = principal != null
                    ? ((CustomUserDetails) ((Authentication) principal).getPrincipal()).getUsername()
                    : "anonymous";

            VoiceSession session = activeSessions.get(sessionId);
            if (session == null) {
                log.warn("⚠️ No active session for chunk: {}", sessionId);
                return;
            }

            // ✅ Store chunk regardless of order
            if (chunk.getData() != null) {
                try {
                    byte[] audioData = java.util.Base64.getDecoder().decode(chunk.getData());
                    session.storeChunk(chunk.getSequenceNumber(), audioData);

                    log.debug("Stored chunk {} ({} bytes), total chunks: {}",
                            chunk.getSequenceNumber(), audioData.length, session.getChunkCount());

                } catch (IllegalArgumentException e) {
                    log.warn("Failed to decode base64 data for chunk {}: {}",
                            chunk.getSequenceNumber(), e.getMessage());
                    return;
                }
            }

            session.setLastChunkReceived(LocalDateTime.now());
            session.setTotalChunks(session.getTotalChunks() + 1);
            session.setTotalBytes(session.getTotalBytes() + chunk.getChunkSizeBytes());

            // Send acknowledgment
            if (principal != null) {
                messagingTemplate.convertAndSendToUser(
                        username,
                        "/queue/voice.ack",
                        Map.of(
                                "ack", chunk.getSequenceNumber(),
                                "timestamp", System.currentTimeMillis(),
                                "sessionId", sessionId));
            } else {
                messagingTemplate.convertAndSend(
                        "/topic/voice.ack/" + sessionId,
                        Map.of(
                                "ack", chunk.getSequenceNumber(),
                                "timestamp", System.currentTimeMillis(),
                                "sessionId", sessionId));
            }

        } catch (Exception e) {
            log.error("❌ Error processing audio chunk: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.stop")
    public void stopStreaming(Principal principal,
            @Header("sessionId") String sessionId,
            @Payload(required = false) Map<String, Object> payload) {

        try {
            VoiceSession session = activeSessions.get(sessionId);

            if (session == null) {
                log.warn("⚠️ No active session found for ID: {}", sessionId);
                messagingTemplate.convertAndSend(
                        "/topic/voice.error/" + sessionId,
                        Map.of("error", "Session not found", "sessionId", sessionId));
                return;
            }

            VoiceUserContext userContext = resolveUserContext(principal, payload, sessionId, session);
            String userId = userContext.userId();
            String username = userContext.username();
            User.UserType userType = parseUserType(userContext.userType());

            log.info("🛑 Voice streaming stopped - User: {}, Type: {}, Session: {}", username, userType, sessionId);

            // ✅ KEY FIX: Wait up to 2 seconds for in-flight chunks to arrive
            // Frontend sends stream + stop almost simultaneously — stop often wins the race
            int waitMs = 0;
            while (session.getChunkCount() == 0 && waitMs < 2000) {
                try {
                    Thread.sleep(100);
                    waitMs += 100;
                    log.debug("⏳ Waiting for chunks... {}ms elapsed", waitMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            log.info("🔍 After wait - Session: {}, Chunks stored: {}",
                    sessionId, session.getChunkCount());

            session.setActive(false);
            session.setCompletedAt(LocalDateTime.now());

            String mode;
            String language = "auto";
            if (payload != null) {
                if (payload.containsKey("mode")) {
                    mode = payload.get("mode").toString();
                } else {
                    mode = (userType == User.UserType.DEMENTIA_PATIENT) ? "dementia" : "standard";
                }
                if (payload.containsKey("language")) {
                    language = payload.get("language").toString();
                }
            } else {
                mode = (userType == User.UserType.DEMENTIA_PATIENT) ? "dementia" : "standard";
            }

            byte[] audioData = session.getReassembledAudio();

            log.info("📦 Reassembled {} chunks into {} bytes of audio for session {}",
                    session.getChunkCount(), audioData.length, sessionId);

            session.resetBuffer();

            final String finalUserId = userId;
            final String finalUsername = username;
            final User.UserType finalUserType = userType;

            voiceService.processCompleteVoice(
                    sessionId,
                    finalUserId,
                    finalUserType.name(),
                    mode,
                    language,
                    audioData).thenAccept(response -> {
                        try {
                            if (principal != null) {
                                messagingTemplate.convertAndSendToUser(
                                        finalUsername,
                                        "/queue/voice.response",
                                        response);
                            } else {
                                messagingTemplate.convertAndSend(
                                        "/topic/voice.response/" + sessionId,
                                        response);
                            }
                            log.info("✅ Voice response sent to: {}", finalUsername);
                        } catch (Exception e) {
                            log.error("Failed to send response: {}", e.getMessage());
                        }
                    }).exceptionally(throwable -> {
                        log.error("❌ Voice processing failed: {}", throwable.getMessage());
                        try {
                            Map<String, Object> errorResponse = Map.of(
                                    "error", "Processing failed",
                                    "message", throwable.getMessage(),
                                    "timestamp", System.currentTimeMillis());

                            if (principal != null) {
                                messagingTemplate.convertAndSendToUser(
                                        finalUsername,
                                        "/queue/voice.error",
                                        errorResponse);
                            } else {
                                messagingTemplate.convertAndSend(
                                        "/topic/voice.error/" + sessionId,
                                        errorResponse);
                            }
                        } catch (Exception e) {
                            log.error("Failed to send error: {}", e.getMessage());
                        }
                        return null;
                    });

        } catch (Exception e) {
            log.error("❌ Error in stop handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.text")
    public void handleTextQuery(Principal principal,
            @Header("sessionId") String sessionId,
            @Payload Map<String, Object> payload) {

        try {
            VoiceUserContext userContext = resolveUserContext(principal, payload, sessionId, null);
            String userId = userContext.userId();
            String username = userContext.username();
            User.UserType userType = parseUserType(userContext.userType());

            log.info("📝 Text query received - User: {}, Type: {}, Session: {}", username, userType, sessionId);

            String text = payload != null && payload.get("text") != null ? payload.get("text").toString() : "";
            if (text.trim().isEmpty()) {
                messagingTemplate.convertAndSend(
                        "/topic/voice.error/" + sessionId,
                        Map.of("error", "Empty text query", "sessionId", sessionId));
                return;
            }

            String mode;
            String language = "auto";
            if (payload != null) {
                if (payload.containsKey("mode")) {
                    mode = payload.get("mode").toString();
                } else {
                    mode = (userType == User.UserType.DEMENTIA_PATIENT) ? "dementia" : "standard";
                }
                if (payload.containsKey("language")) {
                    language = payload.get("language").toString();
                }
            } else {
                mode = (userType == User.UserType.DEMENTIA_PATIENT) ? "dementia" : "standard";
            }

            final String finalUserId = userId;
            final String finalUsername = username;
            final User.UserType finalUserType = userType;

            voiceService.processCompleteText(
                    sessionId,
                    finalUserId,
                    finalUserType.name(),
                    mode,
                    language,
                    text).thenAccept(response -> {
                        try {
                            if (principal != null) {
                                messagingTemplate.convertAndSendToUser(
                                        finalUsername,
                                        "/queue/voice.response",
                                        response);
                            } else {
                                messagingTemplate.convertAndSend(
                                        "/topic/voice.response/" + sessionId,
                                        response);
                            }
                            log.info("✅ Text response sent to: {}", finalUsername);
                        } catch (Exception e) {
                            log.error("Failed to send text response: {}", e.getMessage());
                        }
                    }).exceptionally(throwable -> {
                        log.error("❌ Text processing failed: {}", throwable.getMessage());
                        try {
                            Map<String, Object> errorResponse = Map.of(
                                    "error", "Text processing failed",
                                    "message", throwable.getMessage(),
                                    "timestamp", System.currentTimeMillis());

                            if (principal != null) {
                                messagingTemplate.convertAndSendToUser(
                                        finalUsername,
                                        "/queue/voice.error",
                                        errorResponse);
                            } else {
                                messagingTemplate.convertAndSend(
                                        "/topic/voice.error/" + sessionId,
                                        errorResponse);
                            }
                        } catch (Exception e) {
                            log.error("Failed to send error: {}", e.getMessage());
                        }
                        return null;
                    });

        } catch (Exception e) {
            log.error("❌ Error in text handler: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/voice.cancel")
    public void cancelProcessing(Principal principal,
            @Header("sessionId") String sessionId,
            @Payload(required = false) Map<String, Object> payload) {

        try {
            VoiceSession session = activeSessions.remove(sessionId);
            VoiceUserContext userContext = resolveUserContext(principal, payload, sessionId, session);
            String username = userContext.username();
            log.info("❌ Voice processing cancelled - User: {}, Session: {}", username, sessionId);

            if (session != null) {
                session.setActive(false);
                session.setDisconnectedAt(LocalDateTime.now());
                voiceService.cancelProcessing(sessionId);
            }
            voiceSessionRegistry.markDisconnected(sessionId);

            if (principal != null) {
                messagingTemplate.convertAndSendToUser(
                        username,
                        "/queue/voice.cancelled",
                        Map.of(
                                "message", "Processing cancelled",
                                "sessionId", sessionId,
                                "timestamp", System.currentTimeMillis()));
            } else {
                messagingTemplate.convertAndSend(
                        "/topic/voice.cancelled/" + sessionId,
                        Map.of(
                                "message", "Processing cancelled",
                                "sessionId", sessionId,
                                "timestamp", System.currentTimeMillis()));
            }

        } catch (Exception e) {
            log.error("❌ Error in cancel handler: {}", e.getMessage(), e);
        }
    }

    private VoiceUserContext resolveUserContext(Principal principal, Map<String, Object> payload, String sessionId, VoiceSession session) {
        if (principal != null) {
            CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
            return new VoiceUserContext(user.getId(), user.getUsername(), user.getUserType().name());
        }

        if (session != null && session.getUserId() != null && session.getUsername() != null && session.getUserType() != null) {
            return new VoiceUserContext(session.getUserId(), session.getUsername(), session.getUserType());
        }

        String payloadUserId = getPayloadValue(payload, "userId");
        String payloadUsername = getPayloadValue(payload, "username");
        String payloadUserType = getPayloadValue(payload, "userType");

        if (payloadUserId != null && payloadUserType != null) {
            return new VoiceUserContext(
                    payloadUserId,
                    payloadUsername != null ? payloadUsername : payloadUserId,
                    payloadUserType
            );
        }

        return new VoiceUserContext("anonymous_" + sessionId, "anonymous", User.UserType.NORMAL.name());
    }

    private String getPayloadValue(Map<String, Object> payload, String key) {
        if (payload == null || payload.get(key) == null) {
            return null;
        }
        return payload.get(key).toString();
    }

    private User.UserType parseUserType(String userType) {
        try {
            return User.UserType.valueOf(userType);
        } catch (Exception ignored) {
            return User.UserType.NORMAL;
        }
    }

    private record VoiceUserContext(String userId, String username, String userType) {}

    @MessageMapping("/voice.disconnect")
    public void disconnect(Principal principal,
            @Header("sessionId") String sessionId) {

        try {
            String username = "unknown";
            if (principal != null) {
                CustomUserDetails user = (CustomUserDetails) ((Authentication) principal).getPrincipal();
                username = user.getUsername();
                log.info("🔌 Voice WebSocket disconnected - User: {}, Session: {}", username, sessionId);
            } else {
                log.info("🔌 Voice WebSocket disconnected - Anonymous, Session: {}", sessionId);
            }

            VoiceSession session = activeSessions.remove(sessionId);
            if (session != null) {
                session.setActive(false);
                session.setDisconnectedAt(LocalDateTime.now());
                voiceService.cancelProcessing(sessionId);
                log.info("Session {} removed from active sessions", sessionId);
            }
            voiceSessionRegistry.markDisconnected(sessionId);

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

        String username = "unknown";
        if (sha.getUser() != null) {
            username = sha.getUser().getName();
        }

        log.info("🔌 STOMP session disconnected - Session: {}, User: {}", sessionId, username);

        VoiceSession session = activeSessions.remove(sessionId);
        if (session != null) {
            session.setActive(false);
            session.setDisconnectedAt(LocalDateTime.now());
            voiceService.cancelProcessing(sessionId);
            log.info("Session {} cleaned up on disconnect", sessionId);
        }
        voiceSessionRegistry.markDisconnected(sessionId);
    }

    @MessageExceptionHandler
    @SendToUser("/queue/voice.errors")
    public String handleException(Throwable exception, Principal principal) {
        log.error("❌ WebSocket error for user {}: {}",
                principal != null ? principal.getName() : "unknown",
                exception.getMessage(), exception);

        return "Error: " + exception.getMessage();
    }

    @MessageMapping("/voice.ping")
    public void handlePing(Principal principal,
            @Header("sessionId") String sessionId) {

        String username = principal != null
                ? ((CustomUserDetails) ((Authentication) principal).getPrincipal()).getUsername()
                : "anonymous";

        log.debug("💓 Ping received from: {}, session: {}", username, sessionId);

        // Optional: Send pong back
        if (principal != null) {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.pong",
                    Map.of("pong", true, "timestamp", System.currentTimeMillis()));
        } else {
            messagingTemplate.convertAndSend(
                    "/topic/voice.pong/" + sessionId,
                    Map.of("pong", true, "timestamp", System.currentTimeMillis()));
        }
    }

    // ✅ INNER CLASS: VoiceSession with chunk storage
    public static class VoiceSession {

        private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(VoiceSession.class);

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

        // ✅ NEW: Store chunks by sequence number
        private Map<Integer, byte[]> chunkMap = new ConcurrentHashMap<>();

        // ✅ NEW: Store chunk by sequence number
        public void storeChunk(int sequenceNumber, byte[] data) {
            if (data != null && data.length > 0) {
                chunkMap.put(sequenceNumber, data);
            }
        }

        // ✅ NEW: Get reassembled audio from all chunks
        public byte[] getReassembledAudio() {
            if (chunkMap.isEmpty()) {
                return new byte[0];
            }

            List<Integer> sortedSequences = chunkMap.keySet().stream()
                    .sorted()
                    .collect(Collectors.toList());

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            for (Integer seq : sortedSequences) {
                byte[] chunk = chunkMap.get(seq);
                if (chunk != null) {
                    try {
                        output.write(chunk);
                    } catch (IOException e) {
                        log.error("Failed to write chunk {}", seq, e);
                    }
                }
            }
            return output.toByteArray();
        }

        // ✅ NEW: Get chunk count
        public int getChunkCount() {
            return chunkMap.size();
        }

        // ✅ MODIFIED: Reset clears the map
        public void resetBuffer() {
            chunkMap.clear();
            expectedSequence = 0;
        }

        // Existing getters/setters...
        public String getSessionId() {
            return sessionId;
        }

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getUserType() {
            return userType;
        }

        public void setUserType(String userType) {
            this.userType = userType;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }

        public int getExpectedSequence() {
            return expectedSequence;
        }

        public void setExpectedSequence(int expectedSequence) {
            this.expectedSequence = expectedSequence;
        }

        public int getTotalChunks() {
            return totalChunks;
        }

        public void setTotalChunks(int totalChunks) {
            this.totalChunks = totalChunks;
        }

        public long getTotalBytes() {
            return totalBytes;
        }

        public void setTotalBytes(long totalBytes) {
            this.totalBytes = totalBytes;
        }

        public LocalDateTime getConnectedAt() {
            return connectedAt;
        }

        public void setConnectedAt(LocalDateTime connectedAt) {
            this.connectedAt = connectedAt;
        }

        public LocalDateTime getLastChunkReceived() {
            return lastChunkReceived;
        }

        public void setLastChunkReceived(LocalDateTime lastChunkReceived) {
            this.lastChunkReceived = lastChunkReceived;
        }

        public LocalDateTime getCompletedAt() {
            return completedAt;
        }

        public void setCompletedAt(LocalDateTime completedAt) {
            this.completedAt = completedAt;
        }

        public LocalDateTime getDisconnectedAt() {
            return disconnectedAt;
        }

        public void setDisconnectedAt(LocalDateTime disconnectedAt) {
            this.disconnectedAt = disconnectedAt;
        }

        public String getInteractionId() {
            return interactionId;
        }

        public void setInteractionId(String interactionId) {
            this.interactionId = interactionId;
        }

        public boolean isProcessing() {
            return processing;
        }

        public void setProcessing(boolean processing) {
            this.processing = processing;
        }
    }
}
