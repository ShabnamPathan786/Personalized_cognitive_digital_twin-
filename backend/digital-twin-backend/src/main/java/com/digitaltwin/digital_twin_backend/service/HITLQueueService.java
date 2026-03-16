package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.ConfidenceScore;
import com.digitaltwin.digital_twin_backend.dto.VoiceResponse;
import com.digitaltwin.digital_twin_backend.model.HITLQueueItem;
import com.digitaltwin.digital_twin_backend.model.User;
import com.digitaltwin.digital_twin_backend.repository.HITLQueueRepository;
import com.digitaltwin.digital_twin_backend.repository.UserRepository;
import com.digitaltwin.digital_twin_backend.websocket.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class HITLQueueService {

    private final HITLQueueRepository queueRepository;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;
    private final TTSService ttsService;
    private final NoteService noteService;

    @Value("${app.hitl.review-timeout:300}")
    private int reviewTimeoutSeconds;

    @Value("${app.hitl.max-retries:2}")
    private int maxRetries;

    public String addToQueue(String userId, String userType, String query,
                             String context, ConfidenceScore confidence,
                             String sessionId) {

        log.info("Adding item to HITL queue for user: {}", userId);

        User user = userRepository.findById(userId).orElse(null);

        HITLQueueItem item = new HITLQueueItem();
        item.setUserId(userId);
        item.setUserFullName(user != null ? user.getFullName() : "Unknown");
        item.setUserType(userType);
        item.setSessionId(sessionId);

        // ✅ FIX: Store username so WebSocket routing works correctly
        item.setUsername(user != null ? user.getUsername() : null);

        item.setQuery(query);
        item.setRetrievedContext(context);
        item.setConfidenceScore(confidence.getScore());
        item.setConfidenceReasons(confidence.getReasons());
        item.setIntentType(confidence.getIntentType());

        // Set priority
        if (confidence.isEmergency()) {
            item.setPriority(HITLQueueItem.PriorityLevel.CRITICAL);
            item.setPriorityReason("Emergency keywords detected");
        } else if ("DEMENTIA_PATIENT".equals(userType)) {
            item.setPriority(HITLQueueItem.PriorityLevel.HIGH);
            item.setPriorityReason("Dementia patient");
        } else if (confidence.getScore() < 30) {
            item.setPriority(HITLQueueItem.PriorityLevel.MEDIUM);
            item.setPriorityReason("Very low confidence");
        } else {
            item.setPriority(HITLQueueItem.PriorityLevel.LOW);
        }

        item.setStatus(HITLQueueItem.QueueStatus.PENDING);
        item.setCreatedAt(LocalDateTime.now());
        item.setExpiresAt(LocalDateTime.now().plusSeconds(reviewTimeoutSeconds));
        item.setRetryCount(0);

        // Save first so we have an ID before async suggestion
        HITLQueueItem saved = queueRepository.save(item);

        // Generate AI suggestion asynchronously
        CompletableFuture.runAsync(() -> {
            try {
                String suggestion = generateAISuggestion(query, context);
                saved.setAiSuggestion(suggestion);
                queueRepository.save(saved);
            } catch (Exception e) {
                log.error("Failed to generate AI suggestion: {}", e.getMessage());
            }
        });

        // Notify reviewers
        notifyReviewers(saved);

        log.info("Added to HITL queue with ID: {}, Priority: {}", saved.getId(), saved.getPriority());

        return saved.getId();
    }

    private String generateAISuggestion(String query, String context) {
        return "Based on the query, the user might be asking about...";
    }

    private void notifyReviewers(HITLQueueItem item) {
        webSocketService.notifyReviewers(Map.of(
                "id", item.getId(),
                "userFullName", item.getUserFullName(),
                "userType", item.getUserType(),
                "query", item.getQuery(),
                "priority", item.getPriority(),
                "createdAt", item.getCreatedAt().toString(),
                "confidenceScore", item.getConfidenceScore(),
                "reasons", item.getConfidenceReasons()
        ));

        log.info("Notified reviewers about new HITL item: {}", item.getId());
    }

    public List<HITLQueueItem> getPendingQueue() {
        return queueRepository.findByStatusOrderByPriorityAscCreatedAtAsc(
                HITLQueueItem.QueueStatus.PENDING
        );
    }

    public HITLQueueItem assignToReviewer(String itemId, String reviewerId) {
        HITLQueueItem item = queueRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        item.setStatus(HITLQueueItem.QueueStatus.ASSIGNED);
        item.setReviewerId(reviewerId);
        item.setAssignedAt(LocalDateTime.now());

        return queueRepository.save(item);
    }

    public HITLQueueItem getItemById(String id) {
        return queueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("HITL item not found with id: " + id));
    }

    public HITLQueueItem rejectItem(String id, String reviewerId, String reason) {
        HITLQueueItem item = getItemById(id);

        if (!reviewerId.equals(item.getReviewerId())) {
            throw new RuntimeException("Not assigned to this reviewer");
        }

        item.setStatus(HITLQueueItem.QueueStatus.REJECTED);
        item.setReviewerNotes(reason);
        item.setReviewedAt(LocalDateTime.now());

        return queueRepository.save(item);
    }

    public HITLQueueItem submitReview(String itemId, String reviewerId,
                                      String response, String reviewerNotes) {

        HITLQueueItem item = queueRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!reviewerId.equals(item.getReviewerId())) {
            throw new RuntimeException("Not assigned to this reviewer");
        }

        // ✅ FIX: Validate username before proceeding
        String username = item.getUsername();
        if (username == null || username.isBlank()) {
            log.error("Cannot send response — username is null for HITL item: {}", itemId);
            throw new RuntimeException("User routing information missing — cannot deliver response");
        }

        try {
            String audioUrl = ttsService.textToSpeech(response, item.getUserId());

            item.setReviewedResponse(response);
            item.setReviewedResponseAudioUrl(audioUrl);
            item.setReviewerNotes(reviewerNotes);
            item.setStatus(HITLQueueItem.QueueStatus.REVIEWED);
            item.setReviewedAt(LocalDateTime.now());

            if (item.getAssignedAt() != null) {
                item.setReviewDurationSeconds(
                        (int) java.time.Duration.between(item.getAssignedAt(), LocalDateTime.now()).getSeconds()
                );
            }

            HITLQueueItem saved = queueRepository.save(item);

            saveToNotes(item);

            // ✅ FIX: Route by username, not userId
            webSocketService.sendVoiceResponse(
                    username,
                    VoiceResponse.builder()
                            .status(VoiceResponse.ResponseStatus.REVIEW_COMPLETED)
                            .interactionId(item.getSessionId())
                            .transcription(item.getQuery())
                            .textResponse(response)
                            .audioUrl(audioUrl)
                            .timestamp(LocalDateTime.now())
                            .build()
            );

            log.info("Review submitted and response sent to username: {}", username);

            return saved;

        } catch (Exception e) {
            log.error("Failed to submit review: {}", e.getMessage());
            throw new RuntimeException("Failed to submit review", e);
        }
    }

    private void saveToNotes(HITLQueueItem item) {
        try {
            String noteTitle = "HITL Response - " + LocalDateTime.now().toLocalDate().toString();
            String noteContent = String.format(
                    "User asked: %s\n\nReviewed response: %s\n\nReviewer notes: %s",
                    item.getQuery(),
                    item.getReviewedResponse(),
                    item.getReviewerNotes() != null ? item.getReviewerNotes() : "None"
            );

            noteService.createHITLNote(
                    item.getUserId(),
                    noteTitle,
                    noteContent,
                    item.getId()
            );

            log.info("Saved HITL response to notes for user: {}", item.getUserId());

        } catch (Exception e) {
            log.error("Failed to save to notes: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 30000)
    public void checkExpiredItems() {
        List<HITLQueueItem> expired = queueRepository.findByStatusAndExpiresAtBefore(
                HITLQueueItem.QueueStatus.PENDING,
                LocalDateTime.now()
        );

        for (HITLQueueItem item : expired) {
            if (item.getRetryCount() < maxRetries) {

                // ✅ FIX: Save old ID BEFORE clearing it
                String oldId = item.getId();
                item.setPreviousQueueId(oldId);
                item.setId(null); // Triggers new document insert

                item.setRetryCount(item.getRetryCount() + 1);
                item.setExpiresAt(LocalDateTime.now().plusSeconds(reviewTimeoutSeconds));
                item.setStatus(HITLQueueItem.QueueStatus.PENDING);

                queueRepository.save(item);
                notifyReviewers(item);

                log.info("Requeued expired item: {} (retry {})", oldId, item.getRetryCount());

            } else {
                item.setStatus(HITLQueueItem.QueueStatus.EXPIRED);
                queueRepository.save(item);

                sendFallbackResponse(item);

                log.info("Item expired after {} retries: {}", maxRetries, item.getId());
            }
        }
    }

    private void sendFallbackResponse(HITLQueueItem item) {
        // ✅ FIX: Route by username, not userId
        String username = item.getUsername();
        if (username == null || username.isBlank()) {
            log.error("Cannot send fallback — username is null for item: {}", item.getId());
            return;
        }

        String fallbackResponse = "DEMENTIA_PATIENT".equals(item.getUserType())
                ? "Mujhe jawab dene mein thoda time lagega. Kripya kuch der baad phir se puchhein."
                : "I need more time to think. Please try again in a few moments.";

        try {
            String audioUrl = ttsService.textToSpeech(fallbackResponse, item.getUserId());

            webSocketService.sendVoiceResponse(
                    username,
                    VoiceResponse.builder()
                            .status(VoiceResponse.ResponseStatus.TIMEOUT)
                            .interactionId(item.getSessionId())
                            .transcription(item.getQuery())
                            .textResponse(fallbackResponse)
                            .audioUrl(audioUrl)
                            .timestamp(LocalDateTime.now())
                            .build()
            );

        } catch (Exception e) {
            log.error("Failed to send fallback response: {}", e.getMessage());
        }
    }
}