package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.Medication;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MedicationRepository extends MongoRepository<Medication, String> {

    List<Medication> findByUserId(String userId);
    List<Medication> findByUserIdAndActiveTrue(String userId);
    List<Medication> findByUserIdOrderByScheduledTimesAsc(String userId);

    // Scheduler needs this — fetch all active medications across all users
    List<Medication> findByActiveTrue();
    // ✅ Find medications for a specific date
    @Query("{ 'userId': ?0, 'scheduledTime': { $gte: ?1, $lt: ?2 } }")
    List<Medication> findByUserIdAndDateRange(String userId, LocalDateTime start, LocalDateTime end);
}