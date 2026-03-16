package com.digitaltwin.digital_twin_backend.service;

import com.digitaltwin.digital_twin_backend.model.Note;
import com.digitaltwin.digital_twin_backend.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;

    /**
     * Create a new note
     */
    public Note createNote(Note note) {
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    /**
     * Create a note from AI summary
     */
    public Note createSummaryNote(String userId, String title, String summary,
                                  String fileId, String fileName) {
        Note note = new Note();
        note.setUserId(userId);
        note.setTitle(title);
        note.setContent(summary);
        note.setType(Note.NoteType.SUMMARY);
        note.setPriority(Note.NotePriority.MEDIUM);
        note.setSourceFileId(fileId);
        note.setSourceFileName(fileName);
        note.setColor("#E9D5FF"); // Purple for summaries
        note.setCategory("AI Summary");
        note.setPinned(false);
        note.setArchived(false);
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());

        return noteRepository.save(note);
    }

    /**
     * Get all notes for a user (excluding archived)
     */
    public List<Note> getUserNotes(String userId) {
        return noteRepository.findByUserIdAndArchivedOrderByCreatedAtDesc(userId, false);
    }

    /**
     * Get notes by type
     */
    public List<Note> getUserNotesByType(String userId, Note.NoteType type) {
        return noteRepository.findByUserIdAndTypeAndArchivedOrderByCreatedAtDesc(userId, type, false);
    }

    /**
     * Get notes by category
     */
    public List<Note> getUserNotesByCategory(String userId, String category) {
        return noteRepository.findByUserIdAndCategory(userId, category);
    }

    /**
     * Get pinned notes
     */
    public List<Note> getPinnedNotes(String userId) {
        return noteRepository.findByUserIdAndPinned(userId, true);
    }

    /**
     * Get archived notes
     */
    public List<Note> getArchivedNotes(String userId) {
        return noteRepository.findByUserIdAndArchivedOrderByCreatedAtDesc(userId, true);
    }

    /**
     * Get note by ID
     */
    public Note getNoteById(String noteId) {
        return noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found"));
    }

    /**
     * Update note
     */
    public Note updateNote(String noteId, Note updatedNote) {
        Note note = getNoteById(noteId);

        if (updatedNote.getTitle() != null) {
            note.setTitle(updatedNote.getTitle());
        }
        if (updatedNote.getContent() != null) {
            note.setContent(updatedNote.getContent());
        }
        if (updatedNote.getType() != null) {
            note.setType(updatedNote.getType());
        }
        if (updatedNote.getPriority() != null) {
            note.setPriority(updatedNote.getPriority());
        }
        if (updatedNote.getColor() != null) {
            note.setColor(updatedNote.getColor());
        }
        if (updatedNote.getCategory() != null) {
            note.setCategory(updatedNote.getCategory());
        }

        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    /**
     * Toggle pin status
     */
    public Note togglePin(String noteId) {
        Note note = getNoteById(noteId);
        note.setPinned(!note.isPinned());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    /**
     * Toggle archive status
     */
    public Note toggleArchive(String noteId) {
        Note note = getNoteById(noteId);
        note.setArchived(!note.isArchived());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    /**
     * Delete note
     */
    public void deleteNote(String noteId) {
        noteRepository.deleteById(noteId);
    }

    /**
     * Search notes by keyword
     */
    public List<Note> searchNotes(String userId, String keyword) {
        List<Note> allNotes = getUserNotes(userId);
        String lowerKeyword = keyword.toLowerCase();

        return allNotes.stream()
                .filter(note ->
                        note.getTitle().toLowerCase().contains(lowerKeyword) ||
                                note.getContent().toLowerCase().contains(lowerKeyword) ||
                                (note.getCategory() != null && note.getCategory().toLowerCase().contains(lowerKeyword))
                )
                .collect(Collectors.toList());
    }

    // Add this method in NoteService class

    public Note createHITLNote(String userId, String title, String content, String hitlQueueId) {
        Note note = new Note();
        note.setUserId(userId);
        note.setTitle(title);
        note.setContent(content);
        note.setType(Note.NoteType.HITL_RESPONSE); // Add this enum value
        note.setPriority(Note.NotePriority.MEDIUM);
        note.setCategory("HITL Review");
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());

        // Store HITL reference
        Map<String, String> metadata = new HashMap<>();
        metadata.put("hitlQueueId", hitlQueueId);
        note.setMetadata(metadata);

        return noteRepository.save(note);
    }
}