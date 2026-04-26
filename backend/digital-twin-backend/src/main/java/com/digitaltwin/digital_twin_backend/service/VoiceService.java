package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.ConfidenceScore;
import com.digitaltwin.digital_twin_backend.dto.Intent;
import com.digitaltwin.digital_twin_backend.dto.VoiceResponse;
import com.digitaltwin.digital_twin_backend.model.AudioChunk;
import com.digitaltwin.digital_twin_backend.model.Medication;
import com.digitaltwin.digital_twin_backend.model.Note;
import com.digitaltwin.digital_twin_backend.model.Routine;
import com.digitaltwin.digital_twin_backend.model.VoiceInteraction;
import com.digitaltwin.digital_twin_backend.repository.RoutineRepository;
import com.digitaltwin.digital_twin_backend.repository.VoiceInteractionRepository;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoiceService {

    private enum DisplayLanguage {
        ENGLISH,
        HINDI_DEVANAGARI
    }

    private final VoiceInteractionRepository interactionRepository;
    private final LLMService llmService;
    private final TTSService ttsService;
    private final HITLQueueService hitlQueueService;
    private final ConfidenceScorer confidenceScorer;
    private final IntentClassifier intentClassifier;
    private final ContextRetrievalService contextRetrievalService;

    // ✅ ADD: Repositories for personal assistant
    private final com.digitaltwin.digital_twin_backend.repository.NoteRepository noteRepository;
    private final com.digitaltwin.digital_twin_backend.repository.MedicationRepository medicationRepository;
    private final RoutineRepository routineRepository;

    @Value("${app.assemblyai.api.key}")
    private String assemblyAIApiKey;

    private final Map<String, VoiceInteraction> pendingInteractions = new ConcurrentHashMap<>();
    private final Map<String, CompletableFuture<VoiceResponse>> processingFutures = new ConcurrentHashMap<>();

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final Gson gson = new Gson();

    // Separate thread pools for different tasks
    private ExecutorService chunkProcessorExecutor;
    private ExecutorService transcriptionExecutor;
    private ExecutorService responseExecutor;

    @PostConstruct
    public void init() {
        // Log API key status (masked)
        if (assemblyAIApiKey == null || assemblyAIApiKey.isBlank() || assemblyAIApiKey.equals("your_key_here")) {
            log.error("❌ AssemblyAI API Key NOT configured! Transcription will fail.");
        } else {
            log.info("✅ AssemblyAI API Key configured: {}...", assemblyAIApiKey.substring(0, 4));
        }

        // For audio chunk processing - lightweight, fast
        chunkProcessorExecutor = Executors.newFixedThreadPool(5, r -> {
            Thread t = new Thread(r);
            t.setName("chunk-processor-" + t.getId());
            t.setDaemon(true);
            return t;
        });

        // For transcription - can be slower, dedicated pool
        transcriptionExecutor = Executors.newFixedThreadPool(3, r -> {
            Thread t = new Thread(r);
            t.setName("transcription-" + t.getId());
            t.setDaemon(true);
            return t;
        });

        // For response generation (LLM, TTS)
        responseExecutor = Executors.newFixedThreadPool(5, r -> {
            Thread t = new Thread(r);
            t.setName("response-" + t.getId());
            t.setDaemon(true);
            return t;
        });

        log.info("VoiceService initialized with dedicated thread pools");
    }

    @PreDestroy
    public void destroy() {
        shutdownExecutor(chunkProcessorExecutor, "ChunkProcessor");
        shutdownExecutor(transcriptionExecutor, "Transcription");
        shutdownExecutor(responseExecutor, "Response");
    }

    private void shutdownExecutor(ExecutorService executor, String name) {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdown();
            try {
                if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                    executor.shutdownNow();
                }
            } catch (InterruptedException e) {
                executor.shutdownNow();
                Thread.currentThread().interrupt();
            }
            log.info("{} executor shutdown complete", name);
        }
    }

    public void processAudioChunk(String sessionId, String userId, AudioChunk chunk) {
        log.debug("Received chunk {} for session {} ({} bytes)",
                chunk.getSequenceNumber(), sessionId, chunk.getChunkSizeBytes());

        if (chunk.getSequenceNumber() < 0) {
            log.warn("Invalid sequence number for chunk: {}", chunk.getSequenceNumber());
        }
    }

    public CompletableFuture<VoiceResponse> processCompleteVoice(
            String sessionId,
            String userId,
            String userType,
            String mode,
            String language,
            byte[] audioData) {

        log.info("Starting voice processing for session: {} ({} bytes)",
                sessionId, audioData != null ? audioData.length : 0);

        CompletableFuture<VoiceResponse> future = new CompletableFuture<>();
        processingFutures.put(sessionId, future);

        transcriptionExecutor.submit(() -> {
            try {
                VoiceResponse response = processVoiceSync(sessionId, userId, userType, mode, language, audioData);
                future.complete(response);
            } catch (Exception e) {
                log.error("Voice processing failed: {}", e.getMessage(), e);
                future.complete(createErrorResponse(sessionId, "Processing failed",
                        getLocalizedErrorMessage("PROCESSING_FAILED", language)));
            } finally {
                processingFutures.remove(sessionId);
                pendingInteractions.remove(sessionId);
            }
        });

        return future;
    }

    private VoiceResponse processVoiceSync(String sessionId, String userId,
            String userType, String mode, String language,
            byte[] audioData) {

        if (audioData == null || audioData.length == 0) {
            log.warn("No audio received for session: {}", sessionId);
            return createErrorResponse(sessionId, "No audio received",
                    getLocalizedErrorMessage("NO_AUDIO", language));
        }

        try {
            log.info("Processing {} bytes for session {}", audioData.length, sessionId);

            // Step 1: Transcribe
            String rawTranscription = transcribeAudio(audioData, language);
            return processTextInternally(sessionId, userId, userType, mode, language, rawTranscription);

        } catch (Exception e) {
            log.error("Voice processing error: {}", e.getMessage(), e);
            return createErrorResponse(sessionId, e.getMessage(),
                    getLocalizedErrorMessage("PROCESSING_FAILED", language));
        }
    }

    public CompletableFuture<VoiceResponse> processCompleteText(
            String sessionId, String userId, String userType, String mode, String language, String rawText) {

        CompletableFuture<VoiceResponse> future = new CompletableFuture<>();
        processingFutures.put(sessionId, future);

        transcriptionExecutor.submit(() -> {
            try {
                VoiceResponse response = processTextInternally(sessionId, userId, userType, mode, language, rawText);
                future.complete(response);
            } catch (Exception e) {
                log.error("Text processing failed: {}", e.getMessage(), e);
                future.complete(createErrorResponse(sessionId, "Processing failed", 
                        getLocalizedErrorMessage("PROCESSING_FAILED", language)));
            } finally {
                processingFutures.remove(sessionId);
                pendingInteractions.remove(sessionId);
            }
        });

        return future;
    }

    private VoiceResponse processTextInternally(String sessionId, String userId,
            String userType, String mode, String language,
            String rawTranscription) {
        try {
            DisplayLanguage displayLanguage = detectDisplayLanguage(rawTranscription);
            String transcription = normalizeTextForDisplay(rawTranscription, displayLanguage, mode, true);

            if (transcription == null || transcription.trim().isEmpty()) {
                return createErrorResponse(sessionId, "Empty transcription",
                        getLocalizedErrorMessage("EMPTY_TRANSCRIPTION", language));
            }

            if (!rawTranscription.equals(transcription)) {
                log.info("Normalized text for session {} from [{}] to [{}]", sessionId, rawTranscription, transcription);
            } else {
                log.info("Text for session {}: {}", sessionId, transcription);
            }

            if (isGreetingQuery(transcription)) {
                String greetingResponse = buildGreetingResponse(userType);
                log.info("Greeting shortcut matched for session {}", sessionId);
                String audioUrl = ttsService.textToSpeech(greetingResponse, userId);
                return adaptVoiceResponseForDisplay(
                        VoiceResponse.success(sessionId, transcription, greetingResponse, audioUrl),
                        displayLanguage,
                        mode);
            }

            // ✅ Check if it's a personal assistant query first
            String personalResponse = handlePersonalAssistantQuery(transcription, userId, userType, mode);
            if (personalResponse != null) {
                log.info("Personal assistant handled query for user {}", userId);
                String audioUrl = ttsService.textToSpeech(personalResponse, userId);
                return adaptVoiceResponseForDisplay(
                        VoiceResponse.success(sessionId, transcription, personalResponse, audioUrl),
                        displayLanguage,
                        mode);
            }

            // Step 2: Classify intent
            Intent intent = intentClassifier.classify(transcription, userType);

            // Step 3: Get context
            String context = contextRetrievalService.retrieveContext(userId, transcription, intent);

            // Step 4: Calculate confidence
            ConfidenceScore confidence = confidenceScorer.calculate(
                    transcription, context, intent, userType);

            // Step 5: Generate response
            VoiceResponse response = generateFinalResponse(transcription, context, userType, mode,
                    userId, sessionId, confidence, language);
            return adaptVoiceResponseForDisplay(response, displayLanguage, mode);

        } catch (Exception e) {
            log.error("Core processing error: {}", e.getMessage(), e);
            return createErrorResponse(sessionId, e.getMessage(),
                    getLocalizedErrorMessage("PROCESSING_FAILED", language));
        }
    }

    private boolean isGreetingQuery(String query) {
        if (query == null) {
            return false;
        }

        String normalized = query
                .toLowerCase(Locale.ROOT)
                .replaceAll("[\\p{Punct}]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isEmpty()) {
            return false;
        }

        List<String> greetingPhrases = List.of(
                "hi",
                "hello",
                "hey",
                "helo",
                "hlo",
                "hallo",
                "namaste",
                "hello hello",
                "helo helo",
                "هلو",
                "هلو هلو",
                "مرحبا",
                "हेलो",
                "हैलो",
                "good morning",
                "good afternoon",
                "good evening",
                "how are you",
                "kaise ho",
                "kaise ho tum");

        return greetingPhrases.stream().anyMatch(phrase ->
                normalized.equals(phrase)
                        || normalized.startsWith(phrase + " ")
                        || normalized.endsWith(" " + phrase)
                        || normalized.contains(" " + phrase + " "));
    }

    private DisplayLanguage detectDisplayLanguage(String text) {
        if (text == null || text.isBlank()) {
            return DisplayLanguage.ENGLISH;
        }

        if (containsDevanagari(text) || containsArabicScript(text) || looksLikeRomanHindi(text)) {
            return DisplayLanguage.HINDI_DEVANAGARI;
        }

        return DisplayLanguage.ENGLISH;
    }

    private VoiceResponse adaptVoiceResponseForDisplay(VoiceResponse response,
            DisplayLanguage displayLanguage,
            String mode) {
        if (response == null) {
            return null;
        }

        if (response.getTranscription() != null && !response.getTranscription().isBlank()) {
            response.setTranscription(normalizeTextForDisplay(response.getTranscription(), displayLanguage, mode, true));
        }

        if (response.getTextResponse() != null && !response.getTextResponse().isBlank()) {
            response.setTextResponse(normalizeTextForDisplay(response.getTextResponse(), displayLanguage, mode, false));
        }

        if (response.getUserFriendlyError() != null && !response.getUserFriendlyError().isBlank()) {
            response.setUserFriendlyError(normalizeTextForDisplay(response.getUserFriendlyError(), displayLanguage, mode, false));
        }

        return response;
    }

    private String normalizeTextForDisplay(String text,
            DisplayLanguage displayLanguage,
            String mode,
            boolean transcription) {
        if (text == null || text.isBlank()) {
            return text;
        }

        try {
            if (displayLanguage == DisplayLanguage.HINDI_DEVANAGARI) {
                if (containsDevanagari(text) && !containsArabicScript(text)) {
                    return text.trim();
                }
                return rewriteTextForDisplay(text, mode, transcription, true);
            }

            if (containsArabicScript(text) || containsDevanagari(text) || looksLikeRomanHindi(text)) {
                return rewriteTextForDisplay(text, mode, transcription, false);
            }
        } catch (Exception e) {
            log.warn("Display normalization skipped for [{}]: {}", text, e.getMessage());
        }

        return text.trim();
    }

    private String rewriteTextForDisplay(String text, String mode, boolean transcription, boolean toHindi) throws IOException {
        String instruction = toHindi
                ? "Convert the following spoken text into natural Devanagari Hindi. Preserve names, medicine names, times, dates, and meaning exactly. Return only the converted text."
                : "Rewrite the following text into natural English. Preserve names, medicine names, times, dates, and meaning exactly. Return only the rewritten text.";

        if (transcription) {
            instruction += " This is a speech transcription, so keep it as what the person said.";
        } else {
            instruction += " This is an assistant reply, so keep it clear and conversational.";
        }

        String prompt = instruction + "\n\nText:\n" + text;
        String langParam = toHindi ? "Hindi" : "English";
        String rewritten = llmService.callLLM(prompt, mode, langParam);
        return rewritten == null || rewritten.isBlank() ? text.trim() : rewritten.trim();
    }

    private boolean containsDevanagari(String text) {
        return text != null && text.matches(".*\\p{InDevanagari}.*");
    }

    private boolean containsArabicScript(String text) {
        return text != null && text.matches(".*\\p{InArabic}.*");
    }

    private boolean looksLikeRomanHindi(String text) {
        if (text == null) {
            return false;
        }

        String normalized = text.toLowerCase(Locale.ROOT);
        List<String> romanHindiMarkers = List.of(
                "mujhe", "mera", "meri", "aaj", "kal", "kya", "kaise", "dawai", "davai",
                "hai", "karna", "lena", "kab", "namaste", "yaad", "poochhiye"
        );

        long hits = romanHindiMarkers.stream()
                .filter(normalized::contains)
                .count();

        return hits >= 2;
    }

    private String buildGreetingResponse(String userType) {
        if ("DEMENTIA_PATIENT".equals(userType)) {
            return "नमस्ते। मैं यहाँ हूँ। आप कैसे हैं?";
        }
        return "Hello. I am here and ready to help. What would you like to know?";
    }

    private String handlePersonalAssistantQuery(String query, String userId, String userType, String mode) {
        String lowerQuery = query.toLowerCase(Locale.ROOT);
        boolean dementiaStyle = "dementia".equalsIgnoreCase(mode) || "DEMENTIA_PATIENT".equals(userType);

        boolean isScheduleQuery = lowerQuery.contains("schedule") ||
                lowerQuery.contains("dawai") ||
                lowerQuery.contains("medicine") ||
                lowerQuery.contains("tablet") ||
                lowerQuery.contains("aaj kya hai") ||
                lowerQuery.contains("reminder") ||
                lowerQuery.contains("kaam") ||
                lowerQuery.contains("task") ||
                lowerQuery.contains("kya lena hai") ||
                lowerQuery.contains("routine") ||
                lowerQuery.contains("today") ||
                lowerQuery.contains("what do i need") ||
                lowerQuery.contains("what do i need today") ||
                lowerQuery.contains("what should i do") ||
                lowerQuery.contains("what should i take") ||
                lowerQuery.contains("today plan") ||
                lowerQuery.contains("my medications") ||
                lowerQuery.contains("my medicine") ||
                lowerQuery.contains("mera schedule") ||
                lowerQuery.contains("meri dawai") ||
                lowerQuery.contains("meri davai") ||
                lowerQuery.contains("aaj mujhe kya karna hai") ||
                lowerQuery.contains("aaj mujhe kya lena hai") ||
                lowerQuery.contains("aaj ka schedule") ||
                lowerQuery.contains("आज") ||
                lowerQuery.contains("दवाई") ||
                lowerQuery.contains("दवा") ||
                lowerQuery.contains("गोली") ||
                lowerQuery.contains("रूटीन") ||
                lowerQuery.contains("शेड्यूल") ||
                lowerQuery.contains("रिमाइंडर") ||
                lowerQuery.contains("काम") ||
                lowerQuery.contains("मुझे क्या करना है") ||
                lowerQuery.contains("मुझे क्या लेना है");

        if (!isScheduleQuery) {
            return null;
        }

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Medication> medications = new ArrayList<>();
        List<Note> reminders = new ArrayList<>();
        List<Routine> routines = new ArrayList<>();

        try {
            List<Medication> medicationResults = medicationRepository.findByUserIdAndActiveTrue(userId);
            medications = medicationResults == null ? new ArrayList<>() : medicationResults.stream()
                    .filter(this::isMedicationScheduledToday)
                    .sorted(Comparator.comparing(this::firstScheduledTimeOrEndOfDay))
                    .toList();
        } catch (Exception e) {
            log.warn("Could not fetch medications for user {}: {}", userId, e.getMessage());
        }

        try {
            List<Note> reminderResults = noteRepository.findByUserIdAndTypeAndDateRange(
                    userId, Note.NoteType.REMINDER, startOfDay, endOfDay);
            reminders = reminderResults == null ? new ArrayList<>() : reminderResults;
        } catch (Exception e) {
            log.warn("Could not fetch reminders for user {}: {}", userId, e.getMessage());
        }

        try {
            List<Routine> routineResults = routineRepository.findByUserIdAndActiveTrue(userId);
            routines = routineResults == null ? new ArrayList<>() : routineResults.stream()
                    .filter(this::isRoutineScheduledToday)
                    .sorted(Comparator.comparing(Routine::getScheduledTime, Comparator.nullsLast(Comparator.naturalOrder())))
                    .limit(4)
                    .toList();
        } catch (Exception e) {
            log.warn("Could not fetch routines for user {}: {}", userId, e.getMessage());
        }

        return dementiaStyle
                ? buildDementiaAssistantResponse(today, medications, reminders, routines)
                : buildStandardAssistantResponse(today, medications, reminders, routines);
    }

    private String buildDementiaAssistantResponse(LocalDate today,
            List<Medication> medications,
            List<Note> reminders,
            List<Routine> routines) {

        StringBuilder response = new StringBuilder();
        response.append("आज ")
                .append(today.format(DateTimeFormatter.ofPattern("dd MMMM")))
                .append(" है। ");

        if (!medications.isEmpty()) {
            Medication nextMedication = medications.get(0);
            response.append("आपकी दवाई ");
            response.append(nextMedication.getName());
            if (nextMedication.getDosage() != null && !nextMedication.getDosage().isBlank()) {
                response.append(" ").append(nextMedication.getDosage());
            }
            response.append(" ");
            response.append(formatMedicationTimes(nextMedication, true));
            response.append("। ");
        } else {
            response.append("आज कोई दवाई निर्धारित नहीं है। ");
        }

        if (!routines.isEmpty()) {
            Routine nextRoutine = routines.get(0);
            response.append("आज आपको ");
            response.append(nextRoutine.getActivityName());
            if (nextRoutine.getScheduledTime() != null) {
                response.append(" ")
                        .append(nextRoutine.getScheduledTime().format(DateTimeFormatter.ofPattern("h:mm a")));
            }
            response.append(" करना है। ");
        }

        if (!reminders.isEmpty()) {
            response.append("याद रखिए: ");
            response.append(reminders.get(0).getTitle());
            response.append("। ");
        }

        response.append("कुछ और पूछिए?");
        return response.toString();
    }

    private String buildStandardAssistantResponse(LocalDate today,
            List<Medication> medications,
            List<Note> reminders,
            List<Routine> routines) {

        StringBuilder response = new StringBuilder();
        response.append("Here is your plan for ")
                .append(today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH))
                .append(", ")
                .append(today.format(DateTimeFormatter.ofPattern("dd MMMM")))
                .append(". ");

        if (!medications.isEmpty()) {
            response.append("Your medications are: ");
            for (int i = 0; i < Math.min(medications.size(), 3); i++) {
                Medication medication = medications.get(i);
                response.append(i + 1).append(") ")
                        .append(medication.getName());
                if (medication.getDosage() != null && !medication.getDosage().isBlank()) {
                    response.append(" ").append(medication.getDosage());
                }
                response.append(" ")
                        .append(formatMedicationTimes(medication, false))
                        .append(". ");
            }
        } else {
            response.append("You do not have any active medications scheduled today. ");
        }

        if (!routines.isEmpty()) {
            response.append("Your upcoming routine items are: ");
            for (int i = 0; i < Math.min(routines.size(), 3); i++) {
                Routine routine = routines.get(i);
                response.append(i + 1).append(") ")
                        .append(routine.getActivityName());
                if (routine.getScheduledTime() != null) {
                    response.append(" at ")
                            .append(routine.getScheduledTime().format(DateTimeFormatter.ofPattern("h:mm a")));
                }
                response.append(". ");
            }
        }

        if (!reminders.isEmpty()) {
            response.append("Your reminders today are: ");
            for (int i = 0; i < Math.min(reminders.size(), 2); i++) {
                Note reminder = reminders.get(i);
                response.append(i + 1).append(") ")
                        .append(reminder.getTitle());
                response.append(". ");
            }
        }

        response.append("Ask if you want the next medicine or full schedule.");
        return response.toString();
    }

    private boolean isMedicationScheduledToday(Medication medication) {
        if (!medication.isActive()) {
            return false;
        }

        List<String> daysOfWeek = medication.getDaysOfWeek();
        if (daysOfWeek == null || daysOfWeek.isEmpty()) {
            return true;
        }

        String today = LocalDate.now().getDayOfWeek().name();
        return daysOfWeek.stream().anyMatch(day -> day != null && day.equalsIgnoreCase(today));
    }

    private boolean isRoutineScheduledToday(Routine routine) {
        if (!routine.isActive()) {
            return false;
        }

        List<String> daysOfWeek = routine.getDaysOfWeek();
        if (daysOfWeek == null || daysOfWeek.isEmpty()) {
            return true;
        }

        String today = LocalDate.now().getDayOfWeek().name();
        return daysOfWeek.stream().anyMatch(day -> day != null && day.equalsIgnoreCase(today));
    }

    private LocalTime firstScheduledTimeOrEndOfDay(Medication medication) {
        if (medication.getScheduledTimes() == null || medication.getScheduledTimes().isEmpty()) {
            return LocalTime.MAX;
        }
        return medication.getScheduledTimes().stream()
                .min(LocalTime::compareTo)
                .orElse(LocalTime.MAX);
    }

    private String formatMedicationTimes(Medication medication, boolean dementiaStyle) {
        if (medication.getScheduledTimes() == null || medication.getScheduledTimes().isEmpty()) {
            return dementiaStyle ? "आज लेना है" : "should be taken today";
        }

        String times = medication.getScheduledTimes().stream()
                .sorted()
                .limit(dementiaStyle ? 1 : 3)
                .map(time -> time.format(DateTimeFormatter.ofPattern("h:mm a")))
                .collect(Collectors.joining(", "));

        return dementiaStyle ? "को " + times + " पर लेना है" : "at " + times;
    }

    private VoiceResponse generateFinalResponse(String transcription, String context,
            String userType, String mode,
            String userId, String sessionId,
            ConfidenceScore confidence,
            String language) {
        log.info("🎯 Intent: {}, Score: {}, High: {}",
                confidence.getIntentType(), confidence.getScore(), confidence.isHighConfidence());
        try {
            if (confidence.isEmergency()) {
                hitlQueueService.addToQueue(userId, userType, transcription, context, confidence, sessionId);
                return handleEmergency(userId, transcription, sessionId, language);
            } else if (confidence.isHighConfidence()) {
                CompletableFuture<VoiceResponse> future = CompletableFuture.supplyAsync(
                        () -> handleDirectLLM(transcription, context, userType, mode, userId, sessionId, language),
                        responseExecutor);
                return future.get(30, TimeUnit.SECONDS);
            } else {
                String reviewId = hitlQueueService.addToQueue(
                        userId, userType, transcription, context, confidence, sessionId);
                
                String systemPrompt = "You are a caring personal assistant. The user asked: \"" + transcription + "\". " +
                      "You could not answer because: " + String.join(", ", confidence.getReasons()) + ". " +
                      "Generate a short (1-2 sentences), empathetic response explicitly in the language the user prefers (Language code/name = " + language + "). " +
                      "Gently explain why you can't answer right now and explicitly tell them that you are asking their caregiver for help, so they should wait.";
                
                String waitMessage = "मैं आपके केयरगिवर को इन्फॉर्म कर रही हूँ, कृपया प्रतीक्षा करें।";
                if (language != null && (language.equalsIgnoreCase("en") || language.equalsIgnoreCase("English"))) {
                    waitMessage = "I am informing your caregiver, please wait.";
                } else if (language != null && (language.equalsIgnoreCase("mr") || language.equalsIgnoreCase("Marathi"))) {
                    waitMessage = "मी तुमच्या केअरगिव्हरला माहिती देत आहे, कृपया प्रतीक्षा करा.";
                }

                try {
                    String llmMsg = llmService.callLLM(systemPrompt, mode, language);
                    if (llmMsg != null && !llmMsg.isBlank()) {
                        waitMessage = llmMsg.trim();
                    }
                } catch (Exception e) {
                    log.error("Failed to generate dynamic wait message. Using fallback.", e);
                }
                
                String audioUrl = null;
                try {
                    audioUrl = ttsService.textToSpeech(waitMessage, userId);
                } catch (Exception e) {
                    log.error("Failed to generate TTS for wait message.", e);
                }
                
                VoiceResponse resp = VoiceResponse.reviewRequired(sessionId, transcription, reviewId, 300);
                resp.setTextResponse(waitMessage);
                resp.setAudioUrl(audioUrl);
                return resp;
            }
        } catch (Exception e) {
            log.error("Response generation failed: {}", e.getMessage());
            return createErrorResponse(sessionId, e.getMessage(),
                    getLocalizedErrorMessage("RESPONSE_FAILED", language));
        }
    }

    private String transcribeAudio(byte[] audioData, String language) throws Exception {
        File tempFile = null;
        int maxRetries = 2;
        int retryCount = 0;

        while (retryCount <= maxRetries) {
            try {
                // ✅ Always use .webm — frontend sends webm
                tempFile = File.createTempFile("audio_", ".webm");
                Files.write(tempFile.toPath(), audioData);
                log.info("Created temp file: {} ({} bytes)",
                        tempFile.getAbsolutePath(), tempFile.length());

                if (tempFile.length() < 1000) {
                    throw new IOException("Audio file too small: " + tempFile.length() + " bytes");
                }

                String uploadUrl = uploadToAssemblyAI(tempFile);
                String transcriptId = requestTranscription(uploadUrl, language);
                return pollTranscriptionWithTimeout(transcriptId, 45);

            } catch (Exception e) {
                retryCount++;
                log.warn("Transcription attempt {} failed: {}", retryCount, e.getMessage());
                if (retryCount > maxRetries)
                    throw e;
                Thread.sleep(1000 * retryCount);
            } finally {
                if (tempFile != null && tempFile.exists()) {
                    tempFile.delete();
                }
            }
        }
        throw new IOException("Transcription failed after retries");
    }

    private String pollTranscriptionWithTimeout(String transcriptId, int timeoutSeconds)
            throws Exception {

        long startTime = System.currentTimeMillis();
        int attempts = 0;
        int maxAttempts = 60;

        while (attempts < maxAttempts &&
                System.currentTimeMillis() - startTime < timeoutSeconds * 1000) {
            attempts++;

            Request request = new Request.Builder()
                    .url("https://api.assemblyai.com/v2/transcript/" + transcriptId)
                    .header("authorization", assemblyAIApiKey)
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.warn("Poll attempt {} failed: {}", attempts, response.code());
                    Thread.sleep(1000);
                    continue;
                }

                String responseBody = response.body().string();
                JsonObject json = gson.fromJson(responseBody, JsonObject.class);
                String status = json.get("status").getAsString();

                log.debug("Transcript status: {}", status);

                if ("completed".equals(status)) {
                    String text = json.get("text").getAsString();
                    log.info("Transcription completed: {}", text.substring(0, Math.min(50, text.length())));
                    return text;
                } else if ("error".equals(status)) {
                    String errorMsg = json.has("error") ? json.get("error").getAsString() : "Unknown error";
                    throw new IOException("Transcription error: " + errorMsg);
                }

                Thread.sleep(1000);
            }
        }

        throw new IOException("Transcription timeout after " + timeoutSeconds + " seconds");
    }

    private String uploadToAssemblyAI(File audioFile) throws IOException {
        log.info("Uploading to AssemblyAI: {} ({} bytes)", audioFile.getName(), audioFile.length());

        // ✅ Raw binary upload — NOT multipart
        // AssemblyAI /v2/upload expects raw bytes, not form-data
        byte[] fileBytes = Files.readAllBytes(audioFile.toPath());

        RequestBody requestBody = RequestBody.create(
                fileBytes,
                MediaType.parse("audio/webm") // explicit webm
        );

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/upload")
                .header("authorization", assemblyAIApiKey)
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            log.info("Upload response: {} - {}", response.code(),
                    responseBody.substring(0, Math.min(200, responseBody.length())));

            if (!response.isSuccessful()) {
                throw new IOException("Upload failed: " + response.code() + " - " + responseBody);
            }

            JsonObject json = gson.fromJson(responseBody, JsonObject.class);
            return json.get("upload_url").getAsString();
        }
    }

    /**
     * ✅ FIXED: AssemblyAI v2 API - removed problematic language_code, added proper
     * error handling
     */
    private String requestTranscription(String audioUrl, String language) throws IOException {
        log.info("Requesting transcription for: {}... Language: {}", audioUrl.substring(0, Math.min(50, audioUrl.length())), language);

        JsonObject jsonBody = new JsonObject();
        jsonBody.addProperty("audio_url", audioUrl);

        // ✅ FIX: Use correct model names - "universal-2" or "universal-3-pro"
        com.google.gson.JsonArray speechModels = new com.google.gson.JsonArray();
        speechModels.add("universal-2"); // or "universal-3-pro" for higher accuracy
        jsonBody.add("speech_models", speechModels);

        jsonBody.addProperty("punctuate", true);

        if (language != null && !language.isEmpty() && !language.equals("auto")) {
            jsonBody.addProperty("language_code", language);
        } else {
            jsonBody.addProperty("language_detection", true);
        }

        String jsonString = jsonBody.toString();
        log.debug("Request body: {}", jsonString);

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/transcript")
                .header("authorization", assemblyAIApiKey)
                .header("content-type", "application/json")
                .post(RequestBody.create(jsonString, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            log.info("Transcription request response: {} - {}", response.code(),
                    responseBody.substring(0, Math.min(200, responseBody.length())));

            if (!response.isSuccessful()) {
                throw new IOException("Transcription request failed: " + response.code() + " - " + responseBody);
            }

            JsonObject json = gson.fromJson(responseBody, JsonObject.class);
            if (!json.has("id")) {
                throw new IOException("No transcript ID in response: " + responseBody);
            }
            return json.get("id").getAsString();
        }
    }

    private VoiceResponse handleDirectLLM(String transcription, String context,
            String userType, String mode,
            String userId, String sessionId,
            String language) {
        try {
            String prompt = buildPrompt(transcription, context, userType, language);
            String llmResponse = llmService.callLLM(prompt, mode, language);
            String audioUrl = ttsService.textToSpeech(llmResponse, userId);
            return VoiceResponse.success(sessionId, transcription, llmResponse, audioUrl);
        } catch (Exception e) {
            log.error("LLM/TTS failed: {}", e.getMessage());
            return createErrorResponse(sessionId, e.getMessage(),
                    getLocalizedErrorMessage("RESPONSE_FAILED", language));
        }
    }

    private VoiceResponse handleEmergency(String userId, String transcription, String sessionId, String language) {
        try {
            String emergencyResponse = getLocalizedErrorMessage("EMERGENCY_ALERT", language);
            String audioUrl = ttsService.textToSpeech(emergencyResponse, userId);
            return VoiceResponse.builder()
                    .status(VoiceResponse.ResponseStatus.SUCCESS)
                    .interactionId(sessionId)
                    .transcription(transcription)
                    .textResponse(emergencyResponse)
                    .audioUrl(audioUrl)
                    .timestamp(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            return createErrorResponse(sessionId, e.getMessage(),
                    "Emergency alert sent. Help is on the way.");
        }
    }

    private VoiceResponse createErrorResponse(String sessionId, String error, String message) {
        log.error("Creating error response for session {}: {}", sessionId, error);
        return VoiceResponse.builder()
                .status(VoiceResponse.ResponseStatus.ERROR)
                .interactionId(sessionId)
                .textResponse(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private String getLocalizedErrorMessage(String errorType, String language) {
        boolean isEnglish = "en".equalsIgnoreCase(language) || "English".equalsIgnoreCase(language);
        boolean isMarathi = "mr".equalsIgnoreCase(language) || "Marathi".equalsIgnoreCase(language);
        
        switch (errorType) {
            case "NO_AUDIO":
                if (isEnglish) return "No audio received. Please speak again.";
                if (isMarathi) return "कोणताही ऑडिओ मिळाला नाही. कृपया पुन्हा बोला.";
                return "कोई ऑडियो नहीं मिला। कृपया फिर से बोलें।";
            case "EMPTY_TRANSCRIPTION":
                if (isEnglish) return "I couldn't understand. Please speak again.";
                if (isMarathi) return "मला समजले नाही. कृपया पुन्हा बोला.";
                return "कुछ समझ नहीं आया। कृपया फिर से बोलें।";
            case "RESPONSE_FAILED":
                if (isEnglish) return "Failed to get a response. Please try again.";
                if (isMarathi) return "प्रतिसाद मिळविण्यात समस्या आली. कृपया पुन्हा प्रयत्न करा.";
                return "रिस्पॉन्स मिलने में समस्या हुई। कृपया फिर से कोशिश करें।";
            case "EMERGENCY_ALERT":
                if (isEnglish) return "Emergency alert sent. Help is on the way.";
                if (isMarathi) return "आणीबाणी अलर्ट पाठवला आहे. मदत येत आहे.";
                return "इमरजेंसी अलर्ट भेज दिया गया है। मदद आ रही है।";
            case "PROCESSING_FAILED":
            default:
                if (isEnglish) return "Processing failed. Please try again.";
                if (isMarathi) return "प्रक्रिया अयशस्वी झाली. कृपया पुन्हा प्रयत्न करा.";
                return "प्रोसेसिंग विफल रही। कृपया फिर से प्रयास करें।";
        }
    }

    private String buildPrompt(String transcription, String context, String userType, String language) {
        StringBuilder prompt = new StringBuilder();

        if ("DEMENTIA_PATIENT".equals(userType)) {
            prompt.append("You are a caring personal assistant for a dementia patient. ")
                    .append("Short sentences (5-8 words). ")
                    .append("Be patient, gentle, and reassuring. ");
        } else {
            prompt.append("You are a helpful AI assistant. ");
        }

        prompt.append("CRITICAL LANGUAGE RULE: You MUST reply in the exact language the user prefers. The preferred language code is: ")
              .append(language != null ? language : "auto")
              .append(". ")
              .append("If 'hi' or 'Hindi', you MUST reply in pure Hindi using the Devanagari Script (हिंदी). ")
              .append("If 'mr' or 'Marathi', you MUST reply in pure Marathi using the Devanagari Script (मराठी). ")
              .append("If 'en' or 'English', reply in English. Do NOT use romanized/Hinglish.\n\n");

        if (context != null && !context.isEmpty()) {
            prompt.append("Patient context:\n").append(context).append("\n\n");
        }

        prompt.append("Patient asked: \"").append(transcription).append("\"\n\nYour response:");
        return prompt.toString();
    }

    public void cancelProcessing(String sessionId) {
        pendingInteractions.remove(sessionId);

        CompletableFuture<VoiceResponse> future = processingFutures.remove(sessionId);
        if (future != null && !future.isDone()) {
            future.complete(createErrorResponse(sessionId, "Cancelled", "Processing cancelled"));
        }

        log.info("Cancelled processing for session: {}", sessionId);
    }
}
