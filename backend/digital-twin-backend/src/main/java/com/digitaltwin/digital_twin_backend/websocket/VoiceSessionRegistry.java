package com.digitaltwin.digital_twin_backend.websocket;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VoiceSessionRegistry {

    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    public void markConnected(String sessionId, String userId, String username, String userType) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        SessionInfo info = sessions.computeIfAbsent(sessionId, key -> new SessionInfo());
        info.setSessionId(sessionId);
        info.setUserId(userId);
        info.setUsername(username);
        info.setUserType(userType);
        info.setActive(true);
        info.setConnectedAt(LocalDateTime.now());
        info.setDisconnectedAt(null);
    }

    public void markDisconnected(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        SessionInfo info = sessions.get(sessionId);
        if (info != null) {
            info.setActive(false);
            info.setDisconnectedAt(LocalDateTime.now());
        }
    }

    public boolean isActive(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return false;
        }

        SessionInfo info = sessions.get(sessionId);
        return info != null && info.isActive();
    }

    public static class SessionInfo {
        private String sessionId;
        private String userId;
        private String username;
        private String userType;
        private boolean active;
        private LocalDateTime connectedAt;
        private LocalDateTime disconnectedAt;

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

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getUserType() {
            return userType;
        }

        public void setUserType(String userType) {
            this.userType = userType;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }

        public LocalDateTime getConnectedAt() {
            return connectedAt;
        }

        public void setConnectedAt(LocalDateTime connectedAt) {
            this.connectedAt = connectedAt;
        }

        public LocalDateTime getDisconnectedAt() {
            return disconnectedAt;
        }

        public void setDisconnectedAt(LocalDateTime disconnectedAt) {
            this.disconnectedAt = disconnectedAt;
        }
    }
}
