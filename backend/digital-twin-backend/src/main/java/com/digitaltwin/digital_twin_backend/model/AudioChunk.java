package com.digitaltwin.digital_twin_backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Audio Chunk Model
 * Used for WebSocket streaming of audio data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AudioChunk {

    private String sessionId;           // Unique session for this interaction
    private int sequenceNumber;          // To ensure order
    private String data;                 // Base64 encoded audio data
    private String format;                // "webm", "wav", etc.
    private int sampleRate;               // 16000, 44100, etc.
    private boolean isLast;                // Is this the final chunk?

    // Metadata
    private long timestamp;                // When chunk was sent
    private int chunkSizeBytes;            // Size for debugging

    // For error recovery
    private boolean retransmission;        // Is this a retransmitted chunk?
    private int originalSequence;          // If retransmission, original seq no.

    // Validation
    public boolean isValid() {
        return sessionId != null &&
                !sessionId.isEmpty() &&
                data != null &&
                !data.isEmpty() &&
                sequenceNumber >= 0;
    }
}