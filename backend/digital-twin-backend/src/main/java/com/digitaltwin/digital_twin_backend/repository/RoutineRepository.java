package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.Routine;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoutineRepository extends MongoRepository<Routine,String> {
    List<Routine> findByUserId(String userId);
    List<Routine> findByUserIdAndActiveTrue(String userId);
    List<Routine>  findByUserIdAndCategory(String userId,Routine.ActivityCategory category);

}
