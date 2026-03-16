package com.digitaltwin.digital_twin_backend.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    private final Map<String, WebSocketSessionInfo> activeSessions = new ConcurrentHashMap<>();

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        try {
            // ✅ FIX: Read username from Principal instead of sessionAttributes.
            // SessionConnectedEvent fires at the raw WebSocket level — BEFORE the
            // STOMP CONNECT frame is fully processed, so sessionAttributes like
            // "userId" and "username" are not populated yet (set later by
            // VoiceWebSocketController.connect()). The Principal however IS
            // available here because Spring Security authenticates the HTTP
            // upgrade request before this event fires.
            Principal principal = headerAccessor.getUser();
            String username = (principal != null) ? principal.getName() : "anonymous";

            // sessionAttributes may still have role/type info if set during handshake
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            String userType = (sessionAttributes != null)
                    ? (String) sessionAttributes.get("userType")
                    : null;

            WebSocketSessionInfo info = new WebSocketSessionInfo();
            info.setSessionId(sessionId);
            info.setUsername(username);
            info.setUserType(userType);
            info.setConnectedAt(LocalDateTime.now());
            info.setActive(true);

            activeSessions.put(sessionId, info);

            log.info("✅ WebSocket Connected - Session: {}, User: {}", sessionId, username);

            broadcastActiveUserCount();

        } catch (Exception e) {
            log.error("Error in connect listener for session {}: {}", sessionId, e.getMessage());
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        WebSocketSessionInfo info = activeSessions.remove(sessionId);

        if (info != null) {
            info.setActive(false);
            info.setDisconnectedAt(LocalDateTime.now());

            long durationSeconds = info.getConnectedAt() != null
                    ? java.time.Duration.between(info.getConnectedAt(), LocalDateTime.now()).getSeconds()
                    : 0;

            log.info("❌ WebSocket Disconnected - Session: {}, User: {}, Duration: {}s",
                    sessionId, info.getUsername(), durationSeconds);
        } else {
            log.info("❌ WebSocket Disconnected - Session: {} (no session record found)", sessionId);
        }

        broadcastActiveUserCount();
    }

    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String destination = headerAccessor.getDestination();

        log.debug("📥 WebSocket Subscribe - Session: {}, Destination: {}", sessionId, destination);

        WebSocketSessionInfo info = activeSessions.get(sessionId);
        if (info != null && destination != null) {
            info.addSubscription(destination);
        }
    }

    @EventListener
    public void handleWebSocketUnsubscribeListener(SessionUnsubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String subscriptionId = headerAccessor.getSubscriptionId();

        log.debug("📤 WebSocket Unsubscribe - Session: {}, Subscription: {}", sessionId, subscriptionId);

        WebSocketSessionInfo info = activeSessions.get(sessionId);
        if (info != null && subscriptionId != null) {
            info.removeSubscription(subscriptionId);
        }
    }

    /**
     * Called by VoiceWebSocketController after /voice.connect is processed,
     * at which point userId and userType are available in session attributes.
     * This updates the session info with the full user identity.
     */
    public void updateSessionInfo(String sessionId, String userId, String userType) {
        WebSocketSessionInfo info = activeSessions.get(sessionId);
        if (info != null) {
            info.setUserId(userId);
            info.setUserType(userType);
            log.debug("Updated session info for session: {}, userId: {}", sessionId, userId);
        }
    }

    private void broadcastActiveUserCount() {
        long count = activeSessions.values().stream()
                .filter(WebSocketSessionInfo::isActive)
                .count();

        try {
            messagingTemplate.convertAndSend("/topic/admin/connections",
                    Map.of(
                            "activeConnections", count,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            // Ignore broadcast errors — admin dashboard is non-critical
        }
    }

    public Map<String, WebSocketSessionInfo> getActiveSessions() {
        return activeSessions;
    }

    public static class WebSocketSessionInfo {
        private String sessionId;
        private String userId;
        private String username;
        private String userType;
        private boolean active;
        private LocalDateTime connectedAt;
        private LocalDateTime disconnectedAt;
        private final Map<String, String> subscriptions = new ConcurrentHashMap<>();

        public String getSessionId() { return sessionId; }
        public void setSessionId(String s) { this.sessionId = s; }

        public String getUserId() { return userId; }
        public void setUserId(String s) { this.userId = s; }

        public String getUsername() { return username; }
        public void setUsername(String s) { this.username = s; }

        public String getUserType() { return userType; }
        public void setUserType(String s) { this.userType = s; }

        public boolean isActive() { return active; }
        public void setActive(boolean b) { this.active = b; }

        public LocalDateTime getConnectedAt() { return connectedAt; }
        public void setConnectedAt(LocalDateTime t) { this.connectedAt = t; }

        public LocalDateTime getDisconnectedAt() { return disconnectedAt; }
        public void setDisconnectedAt(LocalDateTime t) { this.disconnectedAt = t; }

        public Map<String, String> getSubscriptions() { return subscriptions; }

        public void addSubscription(String destination) {
            subscriptions.put("sub_" + System.currentTimeMillis(), destination);
        }

        public void removeSubscription(String subscriptionId) {
            subscriptions.remove(subscriptionId);
        }
    }
}