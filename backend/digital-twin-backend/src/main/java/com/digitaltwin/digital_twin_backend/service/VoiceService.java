package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.dto.ConfidenceScore;
import com.digitaltwin.digital_twin_backend.dto.Intent;
import com.digitaltwin.digital_twin_backend.dto.VoiceResponse;
import com.digitaltwin.digital_twin_backend.model.AudioChunk;
import com.digitaltwin.digital_twin_backend.model.VoiceInteraction;
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
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoiceService {

    private final VoiceInteractionRepository interactionRepository;
    private final LLMService llmService;
    private final TTSService ttsService;
    private final HITLQueueService hitlQueueService;
    private final ConfidenceScorer confidenceScorer;
    private final IntentClassifier intentClassifier;
    private final ContextRetrievalService contextRetrievalService;

    @Value("${app.assemblyai.api.key}")
    private String assemblyAIApiKey;

    private final Map<String, ByteArrayOutputStream> audioBuffers = new ConcurrentHashMap<>();
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

    /**
     * Process incoming audio chunk - COMPLETELY NON-BLOCKING
     * WebSocket thread sirf yeh call karta hai aur turant free ho jata hai
     */
    public void processAudioChunk(String sessionId, String userId, AudioChunk chunk) {
        // IMMEDIATE RETURN - WebSocket thread free!
        chunkProcessorExecutor.submit(() -> {
            try {
                long startTime = System.currentTimeMillis();

                ByteArrayOutputStream buffer = audioBuffers.computeIfAbsent(
                        sessionId, k -> new ByteArrayOutputStream()
                );

                byte[] audioData = java.util.Base64.getDecoder().decode(chunk.getData());
                buffer.write(audioData);

                // Update or create interaction
                pendingInteractions.computeIfAbsent(sessionId, k -> {
                    VoiceInteraction interaction = new VoiceInteraction();
                    interaction.setUserId(userId);
                    interaction.setStatus(VoiceInteraction.VoiceStatus.RECORDING);
                    interaction.setCreatedAt(LocalDateTime.now());
                    return interaction;
                });

                long processingTime = System.currentTimeMillis() - startTime;
                log.debug("Processed chunk {} for session {} in {}ms",
                        chunk.getSequenceNumber(), sessionId, processingTime);

            } catch (Exception e) {
                log.error("Failed to process audio chunk: {}", e.getMessage());
            }
        });
    }

    /**
     * Process complete voice - FULLY ASYNC, RETURNS IMMEDIATELY
     */
    public CompletableFuture<VoiceResponse> processCompleteVoice(
            String sessionId, String userId, String userType, String mode) {

        log.info("Starting voice processing for session: {}", sessionId);

        // Create future that will complete when processing is done
        CompletableFuture<VoiceResponse> future = new CompletableFuture<>();
        processingFutures.put(sessionId, future);

        // Submit transcription task to dedicated executor
        transcriptionExecutor.submit(() -> {
            try {
                VoiceResponse response = processVoiceSync(sessionId, userId, userType, mode);
                future.complete(response);
            } catch (Exception e) {
                log.error("Voice processing failed: {}", e.getMessage(), e);
                future.complete(createErrorResponse(sessionId, "Processing failed",
                        "Processing failed. Kripya phir se koshish karein."));
            } finally {
                processingFutures.remove(sessionId);
                audioBuffers.remove(sessionId);
                pendingInteractions.remove(sessionId);
            }
        });

        // Return immediately - WebSocket thread is FREE!
        return future;
    }

    /**
     * Synchronous voice processing (runs in background thread)
     */
    private VoiceResponse processVoiceSync(String sessionId, String userId,
                                           String userType, String mode) {

        ByteArrayOutputStream buffer = audioBuffers.get(sessionId);
        VoiceInteraction interaction = pendingInteractions.get(sessionId);

        if (buffer == null || buffer.size() == 0) {
            log.warn("No audio received for session: {}", sessionId);
            return createErrorResponse(sessionId, "No audio received",
                    "Koi audio nahi mila. Kripya phir se bolein.");
        }

        try {
            byte[] audioData = buffer.toByteArray();
            log.info("Processing {} bytes for session {}", audioData.length, sessionId);

            // Step 1: Transcribe (blocks but in background thread)
            String transcription = transcribeAudio(audioData);

            if (transcription == null || transcription.trim().isEmpty()) {
                return createErrorResponse(sessionId, "Empty transcription",
                        "Kuch samajh nahi aaya. Kripya phir se bolein.");
            }

            // Step 2: Classify intent
            Intent intent = intentClassifier.classify(transcription, userType);

            // Step 3: Get context
            String context = contextRetrievalService.retrieveContext(userId, transcription, intent);

            // Step 4: Calculate confidence
            ConfidenceScore confidence = confidenceScorer.calculate(
                    transcription, context, intent, userType);

            // Step 5: Generate response based on confidence
            return generateFinalResponse(transcription, context, userType, mode,
                    userId, sessionId, confidence);

        } catch (Exception e) {
            log.error("Voice processing error: {}", e.getMessage(), e);
            return createErrorResponse(sessionId, e.getMessage(),
                    "Processing failed. Kripya phir se koshish karein.");
        }
    }

    /**
     * Generate final response using appropriate executor
     */
    private VoiceResponse generateFinalResponse(String transcription, String context,
                                                String userType, String mode,
                                                String userId, String sessionId,
                                                ConfidenceScore confidence) {

        try {
            if (confidence.isEmergency()) {
                return handleEmergency(userId, transcription, sessionId);
            } else if (confidence.isHighConfidence()) {
                // Use responseExecutor for LLM/TTS calls
                CompletableFuture<VoiceResponse> future = CompletableFuture.supplyAsync(() ->
                                handleDirectLLM(transcription, context, userType, mode, userId, sessionId),
                        responseExecutor
                );
                return future.get(30, TimeUnit.SECONDS);
            } else {
                String reviewId = hitlQueueService.addToQueue(
                        userId, userType, transcription, context, confidence, sessionId);
                return VoiceResponse.reviewRequired(sessionId, transcription, reviewId, 300);
            }
        } catch (Exception e) {
            log.error("Response generation failed: {}", e.getMessage());
            return createErrorResponse(sessionId, e.getMessage(),
                    "Response lene mein problem hui. Kripya phir se koshish karein.");
        }
    }

    /**
     * Transcribe audio with timeout and retry
     */
    private String transcribeAudio(byte[] audioData) throws Exception {
        File tempFile = null;
        int maxRetries = 2;
        int retryCount = 0;

        while (retryCount <= maxRetries) {
            try {
                tempFile = File.createTempFile("audio_", ".webm");
                Files.write(tempFile.toPath(), audioData);

                String uploadUrl = uploadToAssemblyAI(tempFile);
                String transcriptId = requestTranscription(uploadUrl);

                return pollTranscriptionWithTimeout(transcriptId, 45); // 45 seconds max

            } catch (Exception e) {
                retryCount++;
                log.warn("Transcription attempt {} failed: {}", retryCount, e.getMessage());
                if (retryCount > maxRetries) {
                    throw e;
                }
                Thread.sleep(1000 * retryCount); // Exponential backoff
            } finally {
                if (tempFile != null && tempFile.exists()) {
                    tempFile.delete();
                }
            }
        }

        throw new IOException("Transcription failed after retries");
    }

    /**
     * Poll transcription with timeout
     */
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
                    Thread.sleep(1000);
                    continue;
                }

                JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
                String status = json.get("status").getAsString();

                if ("completed".equals(status)) {
                    return json.get("text").getAsString();
                } else if ("error".equals(status)) {
                    throw new IOException("Transcription error: " +
                            json.get("error").getAsString());
                }

                Thread.sleep(1000);
            }
        }

        throw new IOException("Transcription timeout after " + timeoutSeconds + " seconds");
    }

    private String uploadToAssemblyAI(File audioFile) throws IOException {
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", audioFile.getName(),
                        RequestBody.create(audioFile, MediaType.parse("audio/webm")))
                .build();

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/upload")
                .header("authorization", assemblyAIApiKey)
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Upload failed: " + response.code());
            }
            JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
            return json.get("upload_url").getAsString();
        }
    }

    private String requestTranscription(String audioUrl) throws IOException {
        JsonObject jsonBody = new JsonObject();
        jsonBody.addProperty("audio_url", audioUrl);
        jsonBody.addProperty("language_code", "hi");
        jsonBody.addProperty("punctuate", true);
        jsonBody.addProperty("format_text", true);

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/transcript")
                .header("authorization", assemblyAIApiKey)
                .post(RequestBody.create(jsonBody.toString(),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Transcription request failed: " + response.code());
            }
            JsonObject json = gson.fromJson(response.body().string(), JsonObject.class);
            return json.get("id").getAsString();
        }
    }

    private VoiceResponse handleDirectLLM(String transcription, String context,
                                          String userType, String mode,
                                          String userId, String sessionId) {
        try {
            String prompt = buildPrompt(transcription, context, userType);
            String llmResponse = llmService.callLLM(prompt, mode);
            String audioUrl = ttsService.textToSpeech(llmResponse, userId);
            return VoiceResponse.success(sessionId, transcription, llmResponse, audioUrl);
        } catch (Exception e) {
            log.error("LLM/TTS failed: {}", e.getMessage());
            return createErrorResponse(sessionId, e.getMessage(),
                    "Response generation failed. Kripya phir se koshish karein.");
        }
    }

    private VoiceResponse handleEmergency(String userId, String transcription, String sessionId) {
        try {
            String emergencyResponse = "Emergency alert triggered. Aapke caregivers ko notify kar diya gaya hai.";
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
        return VoiceResponse.builder()
                .status(VoiceResponse.ResponseStatus.ERROR)
                .interactionId(sessionId)
                .textResponse(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private String buildPrompt(String transcription, String context, String userType) {
        StringBuilder prompt = new StringBuilder();

        if ("DEMENTIA_PATIENT".equals(userType)) {
            prompt.append("You are speaking to a dementia patient. ")
                    .append("Use very simple Hindi/English words. ")
                    .append("Short sentences (5-8 words). Be patient and gentle.\n\n");
        } else {
            prompt.append("You are a helpful AI assistant. ")
                    .append("Provide clear, accurate information.\n\n");
        }

        if (context != null && !context.isEmpty()) {
            prompt.append("Context from user's data:\n").append(context).append("\n\n");
        }

        prompt.append("User said: \"").append(transcription).append("\"\n\nYour response:");
        return prompt.toString();
    }

    public void cancelProcessing(String sessionId) {
        audioBuffers.remove(sessionId);
        pendingInteractions.remove(sessionId);

        CompletableFuture<VoiceResponse> future = processingFutures.remove(sessionId);
        if (future != null && !future.isDone()) {
            future.complete(createErrorResponse(sessionId, "Cancelled", "Processing cancelled"));
        }

        log.info("Cancelled processing for session: {}", sessionId);
    }
}