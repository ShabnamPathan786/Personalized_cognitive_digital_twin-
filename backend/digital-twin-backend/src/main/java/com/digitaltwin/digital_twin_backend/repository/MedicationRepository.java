package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.Medication;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicationRepository extends MongoRepository<Medication, String> {


    List<Medication> findByUserId(String userId);


    List<Medication> findByUserIdAndActiveTrue(String userId);


    List<Medication> findByUserIdOrderByScheduledTimesAsc(String userId);
}