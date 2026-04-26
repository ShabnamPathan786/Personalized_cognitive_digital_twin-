package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.HITLQueueItem;
import com.digitaltwin.digital_twin_backend.model.HITLReview;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.HITLQueueService;
import com.digitaltwin.digital_twin_backend.service.LLMService;
import com.digitaltwin.digital_twin_backend.service.TTSService;
import com.digitaltwin.digital_twin_backend.repository.HITLReviewRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/hitl")
@RequiredArgsConstructor
public class HITLController {

    private final HITLQueueService queueService;
    private final LLMService llmService;
    private final TTSService ttsService;
    private final HITLReviewRepository reviewRepository;

    /**
     * Get pending queue for reviewers
     */
    @GetMapping("/queue/pending")
    public ResponseEntity<ApiResponse<List<HITLQueueItem>>> getPendingQueue(Authentication authentication) {
        try {
            CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
            List<HITLQueueItem> queue = queueService.getPendingQueue(user.getId());
            return ResponseEntity.ok(ApiResponse.success("Queue fetched", queue));
        } catch (Exception e) {
            log.error("Failed to fetch queue: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to fetch queue"));
        }
    }

    /**
     * Get specific queue item
     */
    @GetMapping("/queue/{id}")
    public ResponseEntity<ApiResponse<HITLQueueItem>> getQueueItem(@PathVariable String id) {
        try {
            HITLQueueItem item = queueService.getItemById(id);
            return ResponseEntity.ok(ApiResponse.success("Item fetched", item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Item not found"));
        }
    }

    /**
     * Assign item to reviewer
     */
    @PostMapping("/queue/{id}/assign")
    public ResponseEntity<ApiResponse<HITLQueueItem>> assignToReviewer(
            @PathVariable String id,
            Authentication authentication) {
        try {
            CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
            HITLQueueItem item = queueService.assignToReviewer(id, user.getId());
            return ResponseEntity.ok(ApiResponse.success("Item assigned", item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Generate AI suggestion for reviewer
     */
    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<String>> generateSuggestion(@RequestBody SuggestRequest request) {
        try {
            String suggestion = llmService.generateSuggestion(
                    request.getQuery(),
                    request.getContext(),
                    request.getUserType()
            );
            return ResponseEntity.ok(ApiResponse.success("Suggestion generated", suggestion));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to generate suggestion"));
        }
    }

    /**
     * Submit review response
     */
    @PostMapping("/queue/{id}/review")
    public ResponseEntity<ApiResponse<HITLQueueItem>> submitReview(
            @PathVariable String id,
            @RequestBody ReviewRequest request,
            Authentication authentication) {
        try {
            CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();

            HITLQueueItem item = queueService.submitReview(
                    id,
                    user.getId(),
                    request.getResponse(),
                    request.getNotes()
            );

            // Save review record
            HITLReview review = new HITLReview();
            review.setQueueId(id);
            review.setReviewerId(user.getId());
            review.setReviewerName(user.getUsername());
            review.setOriginalQuery(item.getQuery());
            review.setOriginalContext(item.getRetrievedContext());
            review.setAiSuggestion(item.getAiSuggestion());
            review.setFinalResponse(request.getResponse());
            review.setResponseAudioUrl(item.getReviewedResponseAudioUrl());
            review.setTimeToReview(request.getTimeToReview());
            review.setRating(request.getRating());
            review.setReviewerNotes(request.getNotes());
            review.setCreatedAt(LocalDateTime.now());

            reviewRepository.save(review);

            return ResponseEntity.ok(ApiResponse.success("Review submitted", item));

        } catch (Exception e) {
            log.error("Review submission failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Reject item (can't answer)
     */
    @PostMapping("/queue/{id}/reject")
    public ResponseEntity<ApiResponse<HITLQueueItem>> rejectItem(
            @PathVariable String id,
            @RequestBody RejectRequest request,
            Authentication authentication) {
        try {
            CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
            HITLQueueItem item = queueService.rejectItem(id, user.getId(), request.getReason());
            return ResponseEntity.ok(ApiResponse.success("Item rejected", item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get reviewer statistics
     */
    @GetMapping("/stats/reviewers")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReviewerStats() {
        try {
            List<Map<String, Object>> stats = reviewRepository.getReviewerStats();
            return ResponseEntity.ok(ApiResponse.success("Stats fetched", stats));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to fetch stats"));
        }
    }

    /**
     * Get average review time
     */
    @GetMapping("/stats/avg-time")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAverageReviewTime() {
        try {
            Map<String, Object> avgTime = reviewRepository.getAverageReviewTime();
            return ResponseEntity.ok(ApiResponse.success("Average time fetched", avgTime));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to fetch average time"));
        }
    }

    @Data
    public static class SuggestRequest {
        private String query;
        private String context;
        private String userType;
    }

    @Data
    public static class ReviewRequest {
        private String response;
        private String notes;
        private int timeToReview;
        private int rating;
    }

    @Data
    public static class RejectRequest {
        private String reason;
    }
}