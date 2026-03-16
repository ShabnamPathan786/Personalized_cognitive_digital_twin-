package com.digitaltwin.digital_twin_backend.websocket;

import com.digitaltwin.digital_twin_backend.dto.VoiceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * WebSocket Service
 * Helper methods for sending WebSocket messages
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessageSendingOperations messagingTemplate;

    /**
     * Send voice response to specific user
     */
    public void sendVoiceResponse(String username, VoiceResponse response) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.response",
                    response
            );
            log.debug("📤 Sent voice response to user: {}", username);
        } catch (Exception e) {
            log.error("❌ Failed to send voice response to {}: {}", username, e.getMessage());
        }
    }

    /**
     * Send transcription update to user
     */
    public void sendTranscription(String username, String transcription, boolean isFinal) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.transcription",
                    Map.of(
                            "text", transcription,
                            "isFinal", isFinal,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to send transcription to {}: {}", username, e.getMessage());
        }
    }

    /**
     * Send HITL status update to user
     */
    public void sendHITLStatus(String username, String reviewId, String status, String message) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/hitl.status",
                    Map.of(
                            "reviewId", reviewId,
                            "status", status,
                            "message", message,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to send HITL status to {}: {}", username, e.getMessage());
        }
    }

    /**
     * Send error to user
     */
    public void sendError(String username, String error, String details) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.error",
                    Map.of(
                            "error", error,
                            "details", details,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to send error to {}: {}", username, e.getMessage());
        }
    }

    /**
     * Notify reviewers about new HITL item
     */
    public void notifyReviewers(Map<String, Object> hitlItem) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/hitl.new",
                    hitlItem
            );
            log.debug("📤 Notified reviewers about new HITL item: {}", hitlItem.get("id"));
        } catch (Exception e) {
            log.error("❌ Failed to notify reviewers: {}", e.getMessage());
        }
    }

    /**
     * Send HITL queue update to reviewer dashboard
     */
    public void sendQueueUpdate(String reviewerId, Map<String, Object> queueData) {
        try {
            messagingTemplate.convertAndSendToUser(
                    reviewerId,
                    "/queue/hitl.queue",
                    queueData
            );
        } catch (Exception e) {
            log.error("❌ Failed to send queue update to reviewer {}: {}", reviewerId, e.getMessage());
        }
    }

    /**
     * Broadcast system status to admin dashboard
     */
    public void broadcastSystemStatus(Map<String, Object> status) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/admin/status",
                    status
            );
        } catch (Exception e) {
            log.error("❌ Failed to broadcast system status: {}", e.getMessage());
        }
    }

    /**
     * Send ping response
     */
    public void sendPong(String username, String sessionId) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.pong",
                    Map.of(
                            "pong", true,
                            "sessionId", sessionId,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to send pong: {}", e.getMessage());
        }
    }

    /**
     * Send chunk acknowledgment
     */
    public void sendChunkAck(String username, int sequenceNumber) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.ack",
                    Map.of(
                            "ack", sequenceNumber,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to send chunk ack: {}", e.getMessage());
        }
    }

    /**
     * Request retransmission of missing chunk
     */
    public void requestRetransmission(String username, int missingSequence, int lastReceived) {
        try {
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/voice.retransmit",
                    Map.of(
                            "missingSequence", missingSequence,
                            "lastReceived", lastReceived,
                            "timestamp", System.currentTimeMillis()
                    )
            );
        } catch (Exception e) {
            log.error("❌ Failed to request retransmission: {}", e.getMessage());
        }
    }
}