package com.digitaltwin.digital_twin_backend.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.RequiredArgsConstructor;
import okhttp3.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class SummarizationService {

    @Value("${app.ai.service.url}")
    private String aiServiceUrl;   // https://openrouter.ai/api/v1

    @Value("${app.ai.api.key}")
    private String aiApiKey;

    @Value("${app.assemblyai.api.key:}")
    private String assemblyAiApiKey;  // AssemblyAI API key

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .build();

    // ================= PDF Extraction =================

    public String extractTextFromPDF(InputStream pdfInputStream) throws IOException {
        byte[] pdfBytes = pdfInputStream.readAllBytes();
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    public String extractTextFromPDF(File pdfFile) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    // ================= AUDIO/VIDEO Transcription with AssemblyAI =================

    /**
     * Transcribe audio/video file using AssemblyAI
     * @param audioInputStream Input stream of audio/video file
     * @param fileName Original file name
     * @return Transcribed text
     */
    public String transcribeAudio(InputStream audioInputStream, String fileName) throws IOException {
        if (assemblyAiApiKey == null || assemblyAiApiKey.isEmpty()) {
            throw new IllegalStateException("AssemblyAI API key not configured. Please set app.assemblyai.api.key in application.properties");
        }

        // Save input stream to temporary file
        Path tempFile = Files.createTempFile("audio_", getFileExtension(fileName));
        try {
            Files.copy(audioInputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
            return transcribeAudioFile(tempFile.toFile());
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    /**
     * Transcribe audio/video file using AssemblyAI
     */
    public String transcribeAudioFile(File audioFile) throws IOException {
        if (assemblyAiApiKey == null || assemblyAiApiKey.isEmpty()) {
            throw new IllegalStateException("AssemblyAI API key not configured");
        }

        try {
            // Step 1: Upload the audio file to AssemblyAI
            String uploadUrl = uploadFileToAssemblyAI(audioFile);
            System.out.println("File uploaded to AssemblyAI: " + uploadUrl);

            // Step 2: Request transcription
            String transcriptId = requestTranscription(uploadUrl);
            System.out.println("Transcription requested. ID: " + transcriptId);

            // Step 3: Poll for transcription completion
            String transcription = pollForTranscription(transcriptId);
            System.out.println("Transcription completed successfully");

            return transcription;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Transcription interrupted", e);
        }
    }

    /**
     * Step 1: Upload file to AssemblyAI
     */
    private String uploadFileToAssemblyAI(File audioFile) throws IOException {
        RequestBody fileBody = RequestBody.create(audioFile, MediaType.parse("application/octet-stream"));

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/upload")
                .addHeader("authorization", assemblyAiApiKey)
                .post(fileBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                throw new IOException("Failed to upload file to AssemblyAI: " + response.code() + " - " + errorBody);
            }

            String responseBody = response.body().string();
            JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

            return jsonResponse.get("upload_url").getAsString();
        }
    }

    /**
     * Step 2: Request transcription from AssemblyAI
     */
    private String requestTranscription(String audioUrl) throws IOException {
        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("audio_url", audioUrl);

        // Required: Specify speech model
        JsonArray speechModels = new JsonArray();
        speechModels.add("universal-2");  // Use universal-2 model
        requestBody.add("speech_models", speechModels);

        // Optional: Add language detection
        requestBody.addProperty("language_detection", true);

        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url("https://api.assemblyai.com/v2/transcript")
                .addHeader("authorization", assemblyAiApiKey)
                .addHeader("content-type", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                throw new IOException("Failed to request transcription: " + response.code() + " - " + errorBody);
            }

            String responseBody = response.body().string();
            JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

            return jsonResponse.get("id").getAsString();
        }
    }

    /**
     * Step 3: Poll for transcription completion
     */
    private String pollForTranscription(String transcriptId) throws IOException, InterruptedException {
        String pollingUrl = "https://api.assemblyai.com/v2/transcript/" + transcriptId;

        // Poll for up to 10 minutes (120 attempts * 5 seconds)
        for (int i = 0; i < 120; i++) {
            Request request = new Request.Builder()
                    .url(pollingUrl)
                    .addHeader("authorization", assemblyAiApiKey)
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new IOException("Polling failed: " + response.code());
                }

                String responseBody = response.body().string();
                JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

                String status = jsonResponse.get("status").getAsString();
                System.out.println("Transcription status: " + status + " (attempt " + (i + 1) + "/120)");

                switch (status) {
                    case "completed":
                        return jsonResponse.get("text").getAsString();

                    case "error":
                        String error = jsonResponse.has("error") ?
                                jsonResponse.get("error").getAsString() :
                                "Unknown error";
                        throw new IOException("Transcription failed: " + error);

                    case "queued":
                    case "processing":
                        // Wait 5 seconds before next poll
                        Thread.sleep(5000);
                        break;

                    default:
                        throw new IOException("Unknown status: " + status);
                }
            }
        }

        throw new IOException("Transcription timed out after 10 minutes");
    }

    /**
     * Transcribe and summarize audio/video file
     */
    public TranscriptionResult transcribeAndSummarize(InputStream audioInputStream, String fileName, boolean dementiaMode) throws IOException {
        // Step 1: Transcribe audio/video
        String transcription = transcribeAudio(audioInputStream, fileName);

        // Step 2: Summarize transcription
        String summary = dementiaMode ?
                summarizeForDementiaPatient(transcription) :
                summarizeText(transcription);

        return new TranscriptionResult(transcription, summary);
    }

    // ================= NORMAL SUMMARY =================

    public String summarizeText(String text) throws IOException {
        String truncatedText = text.length() > 8000 ? text.substring(0, 8000) : text;

        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", "openai/gpt-4o-mini");
        requestBody.addProperty("temperature", 0.5);
        requestBody.addProperty("max_tokens", 500);

        JsonObject message = new JsonObject();
        message.addProperty("role", "user");
        message.addProperty("content",
                "Provide a clear and concise summary of the following text:\n\n" + truncatedText);

        JsonArray messagesArray = new JsonArray();
        messagesArray.add(message);

        requestBody.add("messages", messagesArray);

        return sendRequest(requestBody);
    }

    // ================= DEMENTIA SUMMARY =================

    public String summarizeForDementiaPatient(String text) throws IOException {
        String truncatedText = text.length() > 8000 ? text.substring(0, 8000) : text;

        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", "openai/gpt-4o-mini");
        requestBody.addProperty("temperature", 0.3);
        requestBody.addProperty("max_tokens", 500);

        JsonObject message = new JsonObject();
        message.addProperty("role", "user");
        message.addProperty("content",
                "Rewrite the following text for a dementia patient.\n" +
                        "Use very simple English.\n" +
                        "Use short sentences (5-10 words each).\n" +
                        "Do not use technical words.\n" +
                        "Explain gently and clearly.\n\n" +
                        truncatedText);

        JsonArray messagesArray = new JsonArray();
        messagesArray.add(message);

        requestBody.add("messages", messagesArray);

        return sendRequest(requestBody);
    }

    // ================= COMMON API CALL METHOD =================

    private String sendRequest(JsonObject requestBody) throws IOException {
        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(aiServiceUrl + "/chat/completions")
                .addHeader("Authorization", "Bearer " + aiApiKey)
                .addHeader("Content-Type", "application/json")
                .addHeader("HTTP-Referer", "http://localhost:8080")
                .addHeader("X-Title", "Digital Twin App")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                throw new IOException("AI API request failed: " + response.code() + "\n" + responseBody);
            }

            JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

            return jsonResponse
                    .getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();
        }
    }

    // ================= HELPER METHODS =================

    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot) : ".tmp";
    }

    // ================= RESULT CLASS =================

    public static class TranscriptionResult {
        private final String transcription;
        private final String summary;

        public TranscriptionResult(String transcription, String summary) {
            this.transcription = transcription;
            this.summary = summary;
        }

        public String getTranscription() {
            return transcription;
        }

        public String getSummary() {
            return summary;
        }
    }
}