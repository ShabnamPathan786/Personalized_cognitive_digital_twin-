package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.Intent;
import com.digitaltwin.digital_twin_backend.model.Note;
import com.digitaltwin.digital_twin_backend.model.Medication;
import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.repository.NoteRepository;
import com.digitaltwin.digital_twin_backend.repository.MedicationRepository;
import com.digitaltwin.digital_twin_backend.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContextRetrievalService {

    private final NoteRepository noteRepository;
    private final MedicationRepository medicationRepository;
    private final RoutineRepository routineRepository;

    private static final List<String> STOP_WORDS = List.of("hai", "hain", "tha", "the", "ko",
            "se", "mein", "ka", "ki", "ke", "aur", "to", "bhi", "kya", "kyun", "kaise");

    public String retrieveContext(String userId, String query, Intent intent) {
        log.info("Retrieving context for user: {}, query: {}", userId, query);

        // Use a LinkedHashSet to avoid duplicate notes from overlapping strategies
        Set<String> contextPieces = new LinkedHashSet<>();

        // Strategy 1: Time-based retrieval
        if (intent.getTimeReference() != Intent.TimeReference.NO_REFERENCE) {
            String timeContext = getTimeBasedContext(userId, intent.getTimeReference());
            if (timeContext != null) contextPieces.add(timeContext);
        }

        // Strategy 2: Intent-based retrieval
        switch (intent.getType()) {
            case "MEMORY_OFFLOAD":
                String memoryContext = getMemoryContext(userId, query, intent.getSubType());
                if (memoryContext != null) contextPieces.add(memoryContext);
                break;
            case "MEDICATION_QUERY":
                String medicationContext = getMedicationContext(userId);
                if (medicationContext != null) contextPieces.add(medicationContext);
                break;
            case "ROUTINE_QUERY":
                String routineContext = getRoutineContext(userId);
                if (routineContext != null) contextPieces.add(routineContext);
                break;
        }

        // Strategy 3: Keyword search — always try
        List<String> keywords = extractKeywords(query);
        String keywordContext = getKeywordSearchContext(userId, keywords);
        if (keywordContext != null) contextPieces.add(keywordContext);

        if (contextPieces.isEmpty()) {
            log.info("No context found for user: {}", userId);
            return null;
        }

        String combinedContext = String.join("\n\n", contextPieces);
        log.info("Retrieved context length: {}", combinedContext.length());
        return combinedContext;
    }

    private String getTimeBasedContext(String userId, Intent.TimeReference timeRef) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start, end;

        switch (timeRef) {
            case YESTERDAY:
                start = now.minusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
                end   = now.minusDays(1).withHour(23).withMinute(59).withSecond(59).withNano(0);
                break;
            case TODAY:
                start = now.withHour(0).withMinute(0).withSecond(0).withNano(0);
                end   = now.withHour(23).withMinute(59).withSecond(59).withNano(0);
                break;
            case TOMORROW:
                start = now.plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
                end   = now.plusDays(1).withHour(23).withMinute(59).withSecond(59).withNano(0);
                break;
            default:
                return null;
        }

        List<Note> notes = noteRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
        if (notes.isEmpty()) return null;

        StringBuilder context = new StringBuilder("Related notes from this time:\n");
        notes.forEach(n -> context.append("- ").append(n.getContent()).append("\n"));
        return context.toString();
    }

    private String getMemoryContext(String userId, String query, String subType) {
        List<Note> notes;

        if (subType != null && !subType.isEmpty()) {
            // ✅ DB-level category filter — no full scan
            notes = noteRepository.findByUserIdAndCategory(userId, subType);
        } else {
            // ✅ DB-level keyword search — no full scan
            List<String> keywords = extractKeywords(query);
            notes = searchNotesByKeywordsInDB(userId, keywords);
        }

        if (notes.isEmpty()) return null;

        List<Note> limited = notes.stream().limit(3).collect(Collectors.toList());
        StringBuilder context = new StringBuilder("Previous notes and memories:\n");
        limited.forEach(n -> context.append("- ").append(n.getContent()).append("\n"));
        return context.toString();
    }

    private String getMedicationContext(String userId) {
        List<Medication> medications = medicationRepository.findByUserIdAndActiveTrue(userId);
        if (medications.isEmpty()) return null;

        LocalTime now = LocalTime.now();
        StringBuilder context = new StringBuilder("Current medications:\n");

        for (Medication med : medications) {
            context.append("- ").append(med.getName()).append(" ")
                    .append(med.getDosage()).append(" at ");

            LocalTime nextDose = null;
            if (med.getScheduledTimes() != null) {
                for (LocalTime time : med.getScheduledTimes()) {
                    if (time.isAfter(now)) {
                        nextDose = time;
                        break;
                    }
                }
                if (nextDose == null && !med.getScheduledTimes().isEmpty()) {
                    nextDose = med.getScheduledTimes().get(0);
                }
            }

            context.append(nextDose != null ? nextDose.toString() : "today").append("\n");
        }

        return context.toString();
    }

    private String getRoutineContext(String userId) {
        List<Routine> routines = routineRepository.findByUserIdAndActiveTrue(userId);
        if (routines.isEmpty()) return null;

        LocalTime now = LocalTime.now();
        StringBuilder context = new StringBuilder("Today's routine:\n");

        // Find the single next routine
        routines.stream()
                .filter(r -> r.getScheduledTime() != null && r.getScheduledTime().isAfter(now))
                .sorted((a, b) -> a.getScheduledTime().compareTo(b.getScheduledTime()))
                .limit(3)
                .forEach(r -> context.append("- ").append(r.getActivityName())
                        .append(" at ").append(r.getScheduledTime()).append("\n"));

        return context.toString();
    }

    private String getKeywordSearchContext(String userId, List<String> keywords) {
        if (keywords.isEmpty()) return null;

        // ✅ DB-level keyword search — no full scan
        List<Note> notes = searchNotesByKeywordsInDB(userId, keywords);
        if (notes.isEmpty()) return null;

        List<Note> limited = notes.stream().limit(2).collect(Collectors.toList());
        StringBuilder context = new StringBuilder("Related information:\n");
        limited.forEach(n -> context.append("- ").append(n.getContent()).append("\n"));
        return context.toString();
    }

    private List<String> extractKeywords(String query) {
        if (query == null || query.isEmpty()) return new ArrayList<>();

        return java.util.Arrays.stream(query.toLowerCase().split("\\s+"))
                .filter(w -> w.length() > 2)
                .filter(w -> !STOP_WORDS.contains(w))
                .distinct()
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * ✅ FIX: DB-level keyword search using repository OR queries per keyword.
     * Previously this loaded ALL notes for the user into memory and filtered
     * in Java — O(n) memory usage per request, catastrophic at scale.
     *
     * Now each keyword triggers a targeted DB query (content OR title match),
     * results are deduplicated via a LinkedHashSet keyed by note ID.
     *
     * NOTE: For best performance, ensure a text index exists on the notes
     * collection in MongoDB:
     *   db.notes.createIndex({ content: "text", title: "text" })
     * Then replace the per-keyword loop with a single $text search query.
     */
    private List<Note> searchNotesByKeywordsInDB(String userId, List<String> keywords) {
        if (keywords.isEmpty()) return new ArrayList<>();

        // Deduplicate results across keyword queries using note ID
        Set<String> seenIds = new LinkedHashSet<>();
        List<Note> results = new ArrayList<>();

        for (String keyword : keywords) {
            List<Note> matches = noteRepository
                    .findByUserIdAndContentContainingIgnoreCaseOrUserIdAndTitleContainingIgnoreCase(
                            userId, keyword, userId, keyword
                    );

            for (Note note : matches) {
                if (seenIds.add(note.getId())) {
                    results.add(note);
                }
            }

            // Stop early once we have enough
            if (results.size() >= 5) break;
        }

        return results;
    }
}