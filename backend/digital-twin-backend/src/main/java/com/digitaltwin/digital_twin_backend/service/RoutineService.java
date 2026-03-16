package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutineService {
    private final RoutineRepository routineRepository;

    public Routine createRoutine(Routine routine){
        routine.setActive(true);
        routine.setCreatedAt(LocalDateTime.now());
        return routineRepository.save(routine);
    }

    public Routine getRoutineById(String id){
        return routineRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Routine not found"));
    }

    public List<Routine> getUserRoutines(String userId){
        return routineRepository.findByUserId(userId);
    }

    public List<Routine> getActiveRoutines(String userId){
        return routineRepository.findByUserIdAndActiveTrue(userId);
    }

    public List<Routine> getRoutinesByCategory(String userId,Routine.ActivityCategory category){
        return routineRepository.findByUserIdAndCategory(userId,category);
    }

}
