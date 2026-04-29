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
        List<Routine> seeded = new java.util.ArrayList<>();
        List<String> allDays = java.util.Arrays.asList("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");
        List<String> weekdays = java.util.Arrays.asList("Monday", "Tuesday", "Wednesday", "Thursday", "Friday");
        List<String> weekends = java.util.Arrays.asList("Saturday", "Sunday");

        // 1. Morning Wake & Hydrate
        Routine morningWake = new Routine();
        morningWake.setUserId(userId);
        morningWake.setActivityName("Morning Wake & Hydrate");
        morningWake.setDescription("Wake up slowly and drink a full glass of water to start the day.");
        morningWake.setCategory(Routine.ActivityCategory.MORNING_ROUTINE);
        morningWake.setScheduledTime(java.time.LocalTime.of(7, 30));
        morningWake.setDurationMinutes(30);
        morningWake.setDaysOfWeek(allDays);
        morningWake.setReminderEnabled(true);
        seeded.add(createRoutine(morningWake));

        // 2. Breakfast & Morning Meds
        Routine breakfastMeds = new Routine();
        breakfastMeds.setUserId(userId);
        breakfastMeds.setActivityName("Breakfast & Morning Medication");
        breakfastMeds.setDescription("Eat a nutritious breakfast and take prescribed morning vitamins/medication.");
        breakfastMeds.setCategory(Routine.ActivityCategory.MEDICATION);
        breakfastMeds.setScheduledTime(java.time.LocalTime.of(8, 0));
        breakfastMeds.setDurationMinutes(45);
        breakfastMeds.setDaysOfWeek(allDays);
        breakfastMeds.setReminderEnabled(true);
        seeded.add(createRoutine(breakfastMeds));

        // 3. Cognitive Therapy / Memory Games
        Routine cognitiveTherapy = new Routine();
        cognitiveTherapy.setUserId(userId);
        cognitiveTherapy.setActivityName("Cognitive Exercise");
        cognitiveTherapy.setDescription("Engage in memory games, puzzles, or reading to keep the mind sharp.");
        cognitiveTherapy.setCategory(Routine.ActivityCategory.RECREATION);
        cognitiveTherapy.setScheduledTime(java.time.LocalTime.of(10, 0));
        cognitiveTherapy.setDurationMinutes(60);
        cognitiveTherapy.setDaysOfWeek(weekdays);
        cognitiveTherapy.setReminderEnabled(true);
        seeded.add(createRoutine(cognitiveTherapy));

        // 4. Light Physical Exercise
        Routine exercise = new Routine();
        exercise.setUserId(userId);
        exercise.setActivityName("Light Physical Activity");
        exercise.setDescription("Take a short walk in the garden or perform seated stretches.");
        exercise.setCategory(Routine.ActivityCategory.EXERCISE);
        exercise.setScheduledTime(java.time.LocalTime.of(11, 30));
        exercise.setDurationMinutes(30);
        exercise.setDaysOfWeek(allDays);
        exercise.setReminderEnabled(true);
        seeded.add(createRoutine(exercise));

        // 5. Lunch Time
        Routine lunch = new Routine();
        lunch.setUserId(userId);
        lunch.setActivityName("Lunch");
        lunch.setDescription("Enjoy a balanced mid-day meal.");
        lunch.setCategory(Routine.ActivityCategory.MEALS);
        lunch.setScheduledTime(java.time.LocalTime.of(13, 0));
        lunch.setDurationMinutes(45);
        lunch.setDaysOfWeek(allDays);
        lunch.setReminderEnabled(true);
        seeded.add(createRoutine(lunch));

        // 6. Rest / Afternoon Nap
        Routine rest = new Routine();
        rest.setUserId(userId);
        rest.setActivityName("Afternoon Rest");
        rest.setDescription("Quiet time or a short nap to recharge energy levels.");
        rest.setCategory(Routine.ActivityCategory.HYGIENE); // closest fit or OTHER
        rest.setScheduledTime(java.time.LocalTime.of(14, 0));
        rest.setDurationMinutes(90);
        rest.setDaysOfWeek(allDays);
        rest.setReminderEnabled(false);
        seeded.add(createRoutine(rest));

        // 7. Social Family Call
        Routine socialCall = new Routine();
        socialCall.setUserId(userId);
        socialCall.setActivityName("Family Connect");
        socialCall.setDescription("Call or video chat with family members to catch up.");
        socialCall.setCategory(Routine.ActivityCategory.SOCIAL);
        socialCall.setScheduledTime(java.time.LocalTime.of(17, 0));
        socialCall.setDurationMinutes(30);
        socialCall.setDaysOfWeek(weekends); // Can be weekends or specific days
        socialCall.setReminderEnabled(true);
        seeded.add(createRoutine(socialCall));

        // 8. Dinner & Evening Meds
        Routine dinnerMeds = new Routine();
        dinnerMeds.setUserId(userId);
        dinnerMeds.setActivityName("Dinner & Evening Medication");
        dinnerMeds.setDescription("Light evening meal followed by nighttime medications.");
        dinnerMeds.setCategory(Routine.ActivityCategory.MEDICATION);
        dinnerMeds.setScheduledTime(java.time.LocalTime.of(19, 0));
        dinnerMeds.setDurationMinutes(45);
        dinnerMeds.setDaysOfWeek(allDays);
        dinnerMeds.setReminderEnabled(true);
        seeded.add(createRoutine(dinnerMeds));

        // 9. Wind Down & Bedtime
        Routine bedtime = new Routine();
        bedtime.setUserId(userId);
        bedtime.setActivityName("Wind Down & Sleep");
        bedtime.setDescription("Evening hygiene, relaxing music, and prepare for bed.");
        bedtime.setCategory(Routine.ActivityCategory.BEDTIME);
        bedtime.setScheduledTime(java.time.LocalTime.of(21, 30));
        bedtime.setDurationMinutes(60);
        bedtime.setDaysOfWeek(allDays);
        bedtime.setReminderEnabled(true);
        seeded.add(createRoutine(bedtime));

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
