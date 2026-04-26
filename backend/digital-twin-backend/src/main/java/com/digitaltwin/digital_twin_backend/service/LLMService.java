package com.digitaltwin.digital_twin_backend.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class LLMService {

    @Value("${app.ai.service.url:https://openrouter.ai/api/v1}")
    private String aiServiceUrl;

    @Value("${app.ai.api.key}")
    private String aiApiKey;

    @Value("${app.ai.model:openai/gpt-4o-mini}")
    private String model;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build();

    /**
     * Legacy call without language
     */
    public String callLLM(String prompt, String mode) throws IOException {
        return callLLM(prompt, mode, "auto");
    }

    /**
     * Call LLM with prompt, mode, and explicit language
     */
    public String callLLM(String prompt, String mode, String language) throws IOException {
        log.info("Calling LLM with prompt length: {}, language: {}", prompt.length(), language);

        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", model);
        requestBody.addProperty("temperature", mode.equals("dementia") ? 0.3 : 0.7);
        requestBody.addProperty("max_tokens", 300);

        JsonArray messages = new JsonArray();

        // System message based on mode
        JsonObject systemMessage = new JsonObject();
        systemMessage.addProperty("role", "system");

        String languageInstruction = "";
        if (language != null && !language.isEmpty() && !language.equalsIgnoreCase("auto")) {
            languageInstruction = " CRITICAL INSTRUCTION: You MUST respond ONLY in " + language + 
                                  ". If Hindi or Marathi, strictly use the Devanagari script. DO NOT output Romanized text. DO NOT mix languages.";
        } else {
            languageInstruction = " Respond in the same language and script as the user.";
        }

        if ("dementia".equals(mode)) {
            systemMessage.addProperty("content",
                    "You are a gentle, patient voice assistant for dementia patients. " +
                            "Use very simple language. Short sentences (5-8 words). " +
                            "Be kind and reassuring. Never use complex medical terms. " +
                            "You CAN answer general knowledge questions (like the Prime Minister, math, facts) directly and truthfully. " +
                            "However, if they ask about their personal schedule, memories, or medicine and it is NOT in the context, politely say you will check with their caregiver." +
                            languageInstruction
            );
        } else {
            systemMessage.addProperty("content",
                    "You are a helpful voice assistant. Provide clear, accurate information. " +
                            "Be concise but friendly. Use natural conversation style." + languageInstruction
            );
        }
        messages.add(systemMessage);

        // User message
        JsonObject userMessage = new JsonObject();
        userMessage.addProperty("role", "user");
        userMessage.addProperty("content", prompt);
        messages.add(userMessage);

        requestBody.add("messages", messages);

        Request request = new Request.Builder()
                .url(aiServiceUrl + "/chat/completions")
                .addHeader("Authorization", "Bearer " + aiApiKey)
                .addHeader("Content-Type", "application/json")
                .addHeader("HTTP-Referer", "http://localhost:8080")
                .addHeader("X-Title", "Digital Twin Voice Assistant")
                .post(RequestBody.create(requestBody.toString(),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                log.error("LLM call failed: {} - {}", response.code(), responseBody);
                throw new IOException("LLM call failed: " + response.code());
            }

            JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();
            String content = json.getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();

            log.info("LLM response received, length: {}", content.length());
            return content;
        }
    }

    /**
     * Generate AI suggestion for HITL reviewer
     */
    public String generateSuggestion(String query, String context, String userType) throws IOException {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Based on the user's query and their context, suggest a response for a human reviewer.\n\n");
        prompt.append("User type: ").append(userType).append("\n");
        prompt.append("Query: \"").append(query).append("\"\n\n");

        if (context != null && !context.isEmpty()) {
            prompt.append("Context from user's data:\n").append(context).append("\n\n");
        }

        prompt.append("Provide a helpful, accurate response suggestion:");

        return callLLM(prompt.toString(), "standard");
    }

    /**
     * Summarize long text (for notes)
     */
    public String summarize(String text, String userType) throws IOException {
        String mode = "DEMENTIA_PATIENT".equals(userType) ? "dementia" : "standard";

        String prompt = "Summarize the following text:\n\n" + text;
        return callLLM(prompt, mode);
    }

    /**
     * Extract key information from query for context search
     */
    public String extractKeywords(String query) throws IOException {
        String prompt = "Extract 3-5 key search terms from this query: \"" + query +
                "\". Return only comma-separated keywords.";

        return callLLM(prompt, "standard");
    }
}