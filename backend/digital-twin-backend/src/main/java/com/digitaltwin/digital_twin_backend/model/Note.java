package com.digitaltwin.digital_twin_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notes")
public class Note {

    @Id
    private String id;

    private String userId;

    private String title;
    private String content;

    private NoteType type;
    private NotePriority priority;

    private String sourceFileId;
    private String sourceFileName;

    private String color;
    private String category;

    private boolean pinned;
    private boolean archived;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime reminderAt;

    private List<String> daysOfWeek; // ADD THIS for ROUTINE types

    private Map<String, String> metadata;  // For additional data like HITL queue ID

    public enum NoteType {
        SUMMARY,
        PERSONAL,
        MEDICAL,
        REMINDER,
        DOCUMENT,
        EMERGENCY,
        TEXT,
        HITL_RESPONSE,  // ADD THIS
        OTHER
    }

    public enum NotePriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }
}