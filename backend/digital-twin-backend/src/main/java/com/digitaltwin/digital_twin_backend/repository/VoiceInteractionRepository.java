package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.VoiceInteraction;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoiceInteractionRepository extends MongoRepository<VoiceInteraction, String> {

    // Find by user
    List<VoiceInteraction> findByUserId(String userId, Sort sort);

    // Find recent interactions
    List<VoiceInteraction> findByUserIdAndCreatedAtAfter(String userId, LocalDateTime after, Sort sort);

    // Find by status
    List<VoiceInteraction> findByStatus(VoiceInteraction.VoiceStatus status);

    // Find interactions requiring HITL
    List<VoiceInteraction> findByRequiredHITLTrue();

    // Find by HITL queue ID
    Optional<VoiceInteraction> findByHitlQueueId(String hitlQueueId);

    // Search by intent type
    List<VoiceInteraction> findByIntentType(String intentType, Sort sort);

    // Find low confidence interactions (for training)
    @Query("{ 'confidenceScore' : { $lt: 70 }, 'requiredHITL' : false }")
    List<VoiceInteraction> findLowConfidenceWithoutHITL();

    // Count interactions by user
    long countByUserId(String userId);

    // Delete old interactions
    void deleteByCreatedAtBefore(LocalDateTime before);
}