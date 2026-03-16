package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.model.FileUpload;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class TTSService {

    @Value("${app.tts.service:elevenlabs}")
    private String ttsService;

    @Value("${app.elevenlabs.api.key:}")
    private String elevenLabsApiKey;

    @Value("${app.elevenlabs.voice.id:pNInz6obpgDQGcFmaJgB}")
    private String elevenLabsVoiceId; // Default voice

    @Value("${app.google.tts.api.key:}")
    private String googleTtsApiKey;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final GridFsTemplate gridFsTemplate;
    private final FileUploadService fileUploadService;

    public TTSService(GridFsTemplate gridFsTemplate, FileUploadService fileUploadService) {
        this.gridFsTemplate = gridFsTemplate;
        this.fileUploadService = fileUploadService;
    }

    /**
     * Convert text to speech and return audio URL
     */
    public String textToSpeech(String text, String userId) throws IOException {
        log.info("Generating TTS for user: {}, text length: {}", userId, text.length());

        // Truncate long text
        if (text.length() > 500) {
            text = text.substring(0, 500) + "...";
        }

        byte[] audioData;

        if ("google".equalsIgnoreCase(ttsService)) {
            audioData = googleTTS(text);
        } else {
            audioData = elevenLabsTTS(text);
        }

        if (audioData == null || audioData.length == 0) {
            throw new IOException("TTS failed - no audio generated");
        }

        // Save to GridFS
        String filename = "tts_" + userId + "_" + System.currentTimeMillis() + ".mp3";
        ObjectId fileId = gridFsTemplate.store(
                new ByteArrayInputStream(audioData),
                filename,
                "audio/mpeg"
        );

        // Create file record
        FileUpload fileUpload = new FileUpload();
        fileUpload.setUserId(userId);
        fileUpload.setFileName(filename);
        fileUpload.setOriginalFileName(filename);
        fileUpload.setFileType("audio/mpeg");
        fileUpload.setFileSize(audioData.length);
        fileUpload.setCategory(FileUpload.FileCategory.AUDIO);
        fileUpload.setGridFsFileId(fileId.toString());
        fileUpload.setDescription("TTS generated response");
        fileUpload.setUploadedAt(LocalDateTime.now());
        fileUpload.setProcessed(true);

        FileUpload saved = fileUploadService.saveMetadata(fileUpload);

        String audioUrl = "/api/files/audio/" + saved.getId();
        log.info("TTS saved with URL: {}", audioUrl);

        return audioUrl;
    }

    /**
     * ElevenLabs TTS
     */
    private byte[] elevenLabsTTS(String text) throws IOException {
        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("text", text);
        requestBody.addProperty("model_id", "eleven_monolingual_v1");

        JsonObject voiceSettings = new JsonObject();
        voiceSettings.addProperty("stability", 0.5);
        voiceSettings.addProperty("similarity_boost", 0.5);
        requestBody.add("voice_settings", voiceSettings);

        Request request = new Request.Builder()
                .url("https://api.elevenlabs.io/v1/text-to-speech/" + elevenLabsVoiceId)
                .addHeader("xi-api-key", elevenLabsApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(requestBody.toString(),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("ElevenLabs TTS failed: {} - {}", response.code(), errorBody);
                throw new IOException("TTS failed: " + response.code());
            }

            return response.body().bytes();
        }
    }

    /**
     * Google TTS (fallback)
     */
    private byte[] googleTTS(String text) throws IOException {
        JsonObject requestBody = new JsonObject();

        JsonObject input = new JsonObject();
        input.addProperty("text", text);
        requestBody.add("input", input);

        JsonObject voice = new JsonObject();
        voice.addProperty("languageCode", "hi-IN");
        voice.addProperty("name", "hi-IN-Standard-A");
        requestBody.add("voice", voice);

        JsonObject audioConfig = new JsonObject();
        audioConfig.addProperty("audioEncoding", "MP3");
        requestBody.add("audioConfig", audioConfig);

        Request request = new Request.Builder()
                .url("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + googleTtsApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(requestBody.toString(),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Google TTS failed: " + response.code());
            }

            String responseBody = response.body().string();
            JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();
            String audioContent = json.get("audioContent").getAsString();

            return java.util.Base64.getDecoder().decode(audioContent);
        }
    }

    /**
     * Convert text to speech for HITL response (with Hindi support)
     */
    public String textToSpeechForDementia(String text, String userId) throws IOException {
        // Simplify text for dementia patients
        String simplified = simplifyForDementia(text);
        return textToSpeech(simplified, userId);
    }

    /**
     * Simplify text for dementia patients
     */
    private String simplifyForDementia(String text) {
        // Basic simplification
        String[] sentences = text.split("[.!?]");
        StringBuilder simplified = new StringBuilder();

        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.isEmpty()) continue;

            // Split long sentences
            String[] words = trimmed.split(" ");
            if (words.length > 8) {
                int mid = words.length / 2;
                simplified.append(String.join(" ", java.util.Arrays.copyOfRange(words, 0, mid)))
                        .append(". ")
                        .append(String.join(" ", java.util.Arrays.copyOfRange(words, mid, words.length)))
                        .append(". ");
            } else {
                simplified.append(trimmed).append(". ");
            }
        }

        return simplified.toString();
    }

    /**
     * Get audio file from GridFS
     */
    public byte[] getAudioFile(String fileId) throws IOException {
        Query query = new Query(Criteria.where("_id").is(fileId));
        var gridFsFile = gridFsTemplate.findOne(query);

        if (gridFsFile == null) {
            throw new IOException("Audio file not found");
        }

        return gridFsTemplate.getResource(gridFsFile).getInputStream().readAllBytes();
    }
}