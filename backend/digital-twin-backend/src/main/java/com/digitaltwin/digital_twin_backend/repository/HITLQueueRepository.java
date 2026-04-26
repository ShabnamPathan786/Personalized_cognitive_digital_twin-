package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.HITLQueueItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HITLQueueRepository extends MongoRepository<HITLQueueItem, String> {

    // Find pending items sorted by priority
    @Query("{ 'status' : 'PENDING' }")
    List<HITLQueueItem> findByStatusOrderByPriorityAscCreatedAtAsc(HITLQueueItem.QueueStatus status);

    // Find by reviewer
    List<HITLQueueItem> findByReviewerId(String reviewerId);

    // Find expired items
    List<HITLQueueItem> findByStatusAndExpiresAtBefore(HITLQueueItem.QueueStatus status, LocalDateTime before);

    List<HITLQueueItem> findByStatusAndUsernameIsNullAndExpiresAtBefore(
            HITLQueueItem.QueueStatus status,
            LocalDateTime before);

    // Find by priority
    List<HITLQueueItem> findByPriority(HITLQueueItem.PriorityLevel priority);

    // Find by user
    List<HITLQueueItem> findByUserId(String userId);

    // Count pending
    long countByStatus(HITLQueueItem.QueueStatus status);

    // Find items waiting for more than X minutes
    @Query("{ 'status' : 'PENDING', 'createdAt' : { $lt: ?0 } }")
    List<HITLQueueItem> findStaleItems(LocalDateTime threshold);

    // Find by session ID (if stored)
    Optional<HITLQueueItem> findBySessionId(String sessionId);
}
