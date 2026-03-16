package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.EmergencyAlert;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyAlertRepository extends MongoRepository<EmergencyAlert,String> {
    List<EmergencyAlert> findByPatientId(String patientId);
    List<EmergencyAlert> findByPatientIdAndStatus(String patientId, EmergencyAlert.AlertStatus status);
    List<EmergencyAlert> findByNotifiedCaregiverIdsContaining(String caregiverId);
    List<EmergencyAlert> findByStatus(EmergencyAlert.AlertStatus status);
    List<EmergencyAlert> findBySeverity(EmergencyAlert.AlertSeverity severity);
}
