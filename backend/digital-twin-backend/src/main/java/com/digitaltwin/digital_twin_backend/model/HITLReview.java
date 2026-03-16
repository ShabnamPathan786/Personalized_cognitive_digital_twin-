package com.digitaltwin.digital_twin_backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "hitl_reviews")
public class HITLReview {

    @Id
    private String id;

    private String queueId;           // Reference to HITLQueueItem
    private String reviewerId;
    private String reviewerName;

    private String originalQuery;
    private String originalContext;
    private String aiSuggestion;

    private String finalResponse;
    private String responseAudioUrl;

    private int timeToReview;          // in seconds
    private int rating;                 // 1-5 (reviewer self-rating)

    private String reviewerNotes;
    private List<String> tags;          // For categorization

    @CreatedDate
    private LocalDateTime createdAt;

    // For training data
    private boolean usedForTraining;
    private String trainingNotes;
}