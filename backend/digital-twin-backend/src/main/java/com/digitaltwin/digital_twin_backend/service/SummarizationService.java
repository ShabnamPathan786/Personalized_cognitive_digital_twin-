package com.digitaltwin.digital_twin_backend.service;


import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.RequiredArgsConstructor;
import okhttp3.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

/**
 * Summarization Service
 * Provides text and PDF summarization using AI APIs (OpenAI, Claude, etc.)
 */
@Service
@RequiredArgsConstructor
public class SummarizationService {

    @Value("${app.ai.service.url}")
    private String aiServiceUrl;

    @Value("${app.ai.api.key}")
    private String aiApiKey;

    private final OkHttpClient httpClient = new OkHttpClient();

    /**
     * Extract text from PDF
     */
    public String extractTextFromPDF(InputStream pdfInputStream) throws IOException {
        try (PDDocument document = PDDocument.load(pdfInputStream)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Extract text from PDF file
     */
    public String extractTextFromPDF(File pdfFile) throws IOException {
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Summarize text using AI API
     * This is a placeholder - you'll need to implement based on your chosen AI provider
     * (OpenAI, Claude, or other)
     */
    public String summarizeText(String text) throws IOException {
        // Limit text length for API (most APIs have token limits)
        String truncatedText = text.length() > 10000 ? text.substring(0, 10000) : text;

        // Create request body for AI API
        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", "gpt-3.5-turbo");

        JsonObject message = new JsonObject();
        message.addProperty("role", "user");
        message.addProperty("content", "Please provide a concise summary of the following text:\n\n" + truncatedText);

        // Note: This is a simplified example. You'll need to adjust based on your AI provider
        // For OpenAI: https://api.openai.com/v1/chat/completions
        // For Claude: https://api.anthropic.com/v1/messages

        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(aiServiceUrl + "/chat/completions")
                .addHeader("Authorization", "Bearer " + aiApiKey)
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("AI API request failed: " + response.code());
            }

            String responseBody = response.body().string();
            JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

            // Extract summary from response
            // Note: Response structure varies by AI provider
            return jsonResponse
                    .getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();
        }
    }

    /**
     * Summarize PDF directly
     */
    public String summarizePDF(InputStream pdfInputStream) throws IOException {
        String extractedText = extractTextFromPDF(pdfInputStream);
        return summarizeText(extractedText);
    }

    /**
     * Generate summary for dementia patients (simpler language)
     */
    public String summarizeForDementiaPatient(String text) throws IOException {
        String truncatedText = text.length() > 10000 ? text.substring(0, 10000) : text;

        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", "gpt-3.5-turbo");

        JsonObject message = new JsonObject();
        message.addProperty("role", "user");
        message.addProperty("content",
                "Please provide a very simple, easy-to-understand summary of the following text " +
                        "for a person with dementia. Use simple words and short sentences:\n\n" + truncatedText);

        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(aiServiceUrl + "/chat/completions")
                .addHeader("Authorization", "Bearer " + aiApiKey)
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("AI API request failed: " + response.code());
            }

            String responseBody = response.body().string();
            JsonObject jsonResponse = JsonParser.parseString(responseBody).getAsJsonObject();

            return jsonResponse
                    .getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();
        }
    }
}
