package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.HITLReview;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface HITLReviewRepository extends MongoRepository<HITLReview, String> {

    // Find by reviewer
    List<HITLReview> findByReviewerId(String reviewerId);

    // Find by queue item
    List<HITLReview> findByQueueId(String queueId);

    // Find reviews in date range
    List<HITLReview> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // Get average review time
    @Aggregation(pipeline = {
            "{ $group: { _id: null, avgTime: { $avg: '$timeToReview' } } }"
    })
    Map<String, Object> getAverageReviewTime();

    // Get reviews by rating
    List<HITLReview> findByRating(int rating);

    // Count by reviewer
    long countByReviewerId(String reviewerId);

    // Get reviewer stats
    @Aggregation(pipeline = {
            "{ $group: { _id: '$reviewerId', count: { $sum: 1 }, avgTime: { $avg: '$timeToReview' } } }",
            "{ $sort: { count: -1 } }"
    })
    List<Map<String, Object>> getReviewerStats();
}