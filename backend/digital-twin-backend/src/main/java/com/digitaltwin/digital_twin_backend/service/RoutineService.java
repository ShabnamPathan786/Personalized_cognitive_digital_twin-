package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    public Routine updateRoutine(String id, Routine updatedRoutine) {
        Routine existing = getRoutineById(id);
        existing.setActivityName(updatedRoutine.getActivityName());
        existing.setDescription(updatedRoutine.getDescription());
        existing.setCategory(updatedRoutine.getCategory());
        existing.setScheduledTime(updatedRoutine.getScheduledTime());
        existing.setDurationMinutes(updatedRoutine.getDurationMinutes());
        existing.setDaysOfWeek(updatedRoutine.getDaysOfWeek());
        existing.setReminderEnabled(updatedRoutine.isReminderEnabled());
        existing.setReminderMinutesBefore(updatedRoutine.getReminderMinutesBefore());
        existing.setActive(updatedRoutine.isActive());
        existing.setUpdatedAt(LocalDateTime.now());
        return routineRepository.save(existing);
    }

    public void deleteRoutine(String id) {
        routineRepository.deleteById(id);
    }

    public List<Routine> seedDummyData(String userId) {
        // Clear old ones first for clean seed? Optional, but good for idempotent seeds
        // We will just add standard routines
        
        List<Routine> seeded = new java.util.ArrayList<>();
        List<String> allDays = java.util.Arrays.asList("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");
        List<String> weekdays = java.util.Arrays.asList("Monday", "Tuesday", "Wednesday", "Thursday", "Friday");
        List<String> weekend = java.util.Arrays.asList("Saturday", "Sunday");

        // 1. Sleep Time
        Routine sleep = new Routine();
        sleep.setUserId(userId);
        sleep.setActivityName("Sleep Time");
        sleep.setDescription("Go to bed and get a good night's rest.");
        sleep.setCategory(Routine.ActivityCategory.BEDTIME);
        sleep.setScheduledTime(java.time.LocalTime.of(22, 0));
        sleep.setDurationMinutes(480); // 8 hours
        sleep.setDaysOfWeek(allDays);
        sleep.setReminderEnabled(true);
        seeded.add(createRoutine(sleep));

        // 2. Wake Up & Hygiene
        Routine wakeUp = new Routine();
        wakeUp.setUserId(userId);
        wakeUp.setActivityName("Morning Hygiene");
        wakeUp.setDescription("Wake up, brush teeth, shower.");
        wakeUp.setCategory(Routine.ActivityCategory.HYGIENE);
        wakeUp.setScheduledTime(java.time.LocalTime.of(7, 0));
        wakeUp.setDurationMinutes(30);
        wakeUp.setDaysOfWeek(allDays);
        wakeUp.setReminderEnabled(true);
        seeded.add(createRoutine(wakeUp));

        // 3. Breakfast
        Routine breakfast = new Routine();
        breakfast.setUserId(userId);
        breakfast.setActivityName("Breakfast");
        breakfast.setDescription("Eat a healthy morning meal.");
        breakfast.setCategory(Routine.ActivityCategory.MEALS);
        breakfast.setScheduledTime(java.time.LocalTime.of(8, 0));
        breakfast.setDurationMinutes(30);
        breakfast.setDaysOfWeek(allDays);
        breakfast.setReminderEnabled(true);
        seeded.add(createRoutine(breakfast));

        // 4. Study/Work Time
        Routine study = new Routine();
        study.setUserId(userId);
        study.setActivityName("Study & Cognitive Exercises");
        study.setDescription("Dedicated time for learning and cognitive exercises.");
        study.setCategory(Routine.ActivityCategory.OTHER); // Can use RECREATION or OTHER
        study.setScheduledTime(java.time.LocalTime.of(10, 0));
        study.setDurationMinutes(120); // 2 hours
        study.setDaysOfWeek(weekdays); // Only weekdays
        study.setReminderEnabled(true);
        seeded.add(createRoutine(study));

        // 5. Lunch
        Routine lunch = new Routine();
        lunch.setUserId(userId);
        lunch.setActivityName("Lunch Time");
        lunch.setDescription("Mid-day meal.");
        lunch.setCategory(Routine.ActivityCategory.MEALS);
        lunch.setScheduledTime(java.time.LocalTime.of(13, 0));
        lunch.setDurationMinutes(45);
        lunch.setDaysOfWeek(allDays);
        lunch.setReminderEnabled(true);
        seeded.add(createRoutine(lunch));
        
        // 6. Relaxation / Recreation
        Routine recreation = new Routine();
        recreation.setUserId(userId);
        recreation.setActivityName("Relaxation & Hobbies");
        recreation.setDescription("Time for reading, TV, or hobbies.");
        recreation.setCategory(Routine.ActivityCategory.RECREATION);
        recreation.setScheduledTime(java.time.LocalTime.of(15, 0));
        recreation.setDurationMinutes(60);
        recreation.setDaysOfWeek(weekend); // Only weekends
        recreation.setReminderEnabled(false);
        seeded.add(createRoutine(recreation));

        // 7. Dinner
        Routine dinner = new Routine();
        dinner.setUserId(userId);
        dinner.setActivityName("Dinner");
        dinner.setDescription("Evening meal with family.");
        dinner.setCategory(Routine.ActivityCategory.MEALS);
        dinner.setScheduledTime(java.time.LocalTime.of(19, 0));
        dinner.setDurationMinutes(45);
        dinner.setDaysOfWeek(allDays);
        dinner.setReminderEnabled(true);
        seeded.add(createRoutine(dinner));

        return seeded;
    }

    public Routine logRoutineCompleted(String routineId, String completedBy) {
        Routine routine = getRoutineById(routineId);
        
        Routine.RoutineLog log = new Routine.RoutineLog();
        log.setScheduledDateTime(LocalDateTime.now());
        log.setCompletedDateTime(LocalDateTime.now());
        log.setStatus(Routine.RoutineStatus.COMPLETED);
        log.setCompletedBy(completedBy);
        log.setNotes("Completed manually");

        if (routine.getLogs() == null) {
            routine.setLogs(new ArrayList<>());
        }
        routine.getLogs().add(log);
        return routineRepository.save(routine);
    }

    public Routine logRoutineMissed(String routineId) {
        Routine routine = getRoutineById(routineId);
        
        Routine.RoutineLog log = new Routine.RoutineLog();
        log.setScheduledDateTime(LocalDateTime.now());
        log.setStatus(Routine.RoutineStatus.MISSED);
        log.setNotes("Automatically marked missed by scheduler");

        if (routine.getLogs() == null) {
            routine.setLogs(new ArrayList<>());
        }
        routine.getLogs().add(log);
        return routineRepository.save(routine);
    }

}
