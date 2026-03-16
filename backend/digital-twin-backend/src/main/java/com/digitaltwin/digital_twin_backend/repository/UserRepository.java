package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    // ==================== BASIC USER QUERIES ====================

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    // ==================== USER TYPE QUERIES ====================

    List<User> findByUserType(User.UserType userType);

    List<User> findByActiveTrue();

    // ==================== CAREGIVER-PATIENT CONNECTION QUERIES ====================

    /**
     * Find all patients linked to a specific caregiver
     * MongoDB automatically queries caregiverIds array
     */
    List<User> findByCaregiverIdsContaining(String caregiverId);

    /**
     * Alternative method using @Query annotation (same result as above)
     * You can use either this or findByCaregiverIdsContaining
     */
    @Query("{ 'caregiverIds': ?0 }")
    List<User> findPatientsByCaregiver(String caregiverId);

    /**
     * Find all caregivers by their IDs
     * Used to fetch patient's linked caregivers
     */
    @Query("{ '_id': { $in: ?0 } }")
    List<User> findCaregiversByIds(List<String> caregiverIds);

    // ==================== OPTIONAL: ADDITIONAL USEFUL QUERIES ====================

    /**
     * Find all patients (users with userType = DEMENTIA_PATIENT)
     */
    List<User> findByUserTypeAndActiveTrue(User.UserType userType, boolean active);

    /**
     * Count total patients linked to a caregiver
     */
    long countByCaregiverIdsContaining(String caregiverId);
}