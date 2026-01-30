package com.digitaltwin.digital_twin_backend.repository;


import com.digitaltwin.digital_twin_backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);


    Optional<User> findByEmail(String email);


    Optional<User> findByUsernameOrEmail(String username, String email);


    boolean existsByUsername(String username);


    boolean existsByEmail(String email);


    List<User> findByUserType(User.UserType userType);


    List<User> findByActiveTrue();



    @Query("{ 'caregiverIds': ?0 }")
    List<User> findPatientsByCaregiver(String caregiverId);


    @Query("{ '_id': { $in: ?0 } }")
    List<User> findCaregiversByIds(List<String> caregiverIds);
}
