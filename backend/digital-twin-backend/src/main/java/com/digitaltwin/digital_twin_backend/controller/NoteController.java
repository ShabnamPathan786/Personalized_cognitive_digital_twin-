package com.digitaltwin.digital_twin_backend.controller;

import com.digitaltwin.digital_twin_backend.dto.ApiResponse;
import com.digitaltwin.digital_twin_backend.model.Note;
import com.digitaltwin.digital_twin_backend.security.CustomUserDetails;
import com.digitaltwin.digital_twin_backend.service.NoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    /**
     * Create a new note
     * POST /api/notes
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Note>> createNote(
            @RequestBody Note note,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            note.setUserId(userDetails.getId());

            Note createdNote = noteService.createNote(note);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Note created successfully", createdNote));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create note: " + e.getMessage()));
        }
    }

    /**
     * Get all notes for current user
     * GET /api/notes
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Note>>> getUserNotes(Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Note> notes = noteService.getUserNotes(userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Notes retrieved successfully", notes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve notes: " + e.getMessage()));
        }
    }

    /**
     * Get notes by type
     * GET /api/notes/type/{type}
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<List<Note>>> getNotesByType(
            @PathVariable Note.NoteType type,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Note> notes = noteService.getUserNotesByType(userDetails.getId(), type);
            return ResponseEntity.ok(ApiResponse.success("Notes retrieved successfully", notes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve notes: " + e.getMessage()));
        }
    }

    /**
     * Get pinned notes
     * GET /api/notes/pinned
     */
    @GetMapping("/pinned")
    public ResponseEntity<ApiResponse<List<Note>>> getPinnedNotes(Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Note> notes = noteService.getPinnedNotes(userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Pinned notes retrieved", notes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve notes: " + e.getMessage()));
        }
    }

    /**
     * Get archived notes
     * GET /api/notes/archived
     */
    @GetMapping("/archived")
    public ResponseEntity<ApiResponse<List<Note>>> getArchivedNotes(Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Note> notes = noteService.getArchivedNotes(userDetails.getId());
            return ResponseEntity.ok(ApiResponse.success("Archived notes retrieved", notes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve notes: " + e.getMessage()));
        }
    }

    /**
     * Search notes
     * GET /api/notes/search?q={keyword}
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Note>>> searchNotes(
            @RequestParam String q,
            Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            List<Note> notes = noteService.searchNotes(userDetails.getId(), q);
            return ResponseEntity.ok(ApiResponse.success("Search results", notes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to search notes: " + e.getMessage()));
        }
    }

    /**
     * Get note by ID
     * GET /api/notes/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Note>> getNoteById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Note note = noteService.getNoteById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!note.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            return ResponseEntity.ok(ApiResponse.success("Note retrieved", note));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update note
     * PUT /api/notes/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Note>> updateNote(
            @PathVariable String id,
            @RequestBody Note note,
            Authentication authentication) {
        try {
            Note existingNote = noteService.getNoteById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!existingNote.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Note updatedNote = noteService.updateNote(id, note);
            return ResponseEntity.ok(ApiResponse.success("Note updated", updatedNote));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Toggle pin
     * PATCH /api/notes/{id}/pin
     */
    @PatchMapping("/{id}/pin")
    public ResponseEntity<ApiResponse<Note>> togglePin(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Note note = noteService.getNoteById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!note.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Note updatedNote = noteService.togglePin(id);
            return ResponseEntity.ok(ApiResponse.success("Pin status updated", updatedNote));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Toggle archive
     * PATCH /api/notes/{id}/archive
     */
    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<Note>> toggleArchive(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Note note = noteService.getNoteById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!note.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            Note updatedNote = noteService.toggleArchive(id);
            return ResponseEntity.ok(ApiResponse.success("Archive status updated", updatedNote));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Delete note
     * DELETE /api/notes/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @PathVariable String id,
            Authentication authentication) {
        try {
            Note note = noteService.getNoteById(id);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            if (!note.getUserId().equals(userDetails.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }

            noteService.deleteNote(id);
            return ResponseEntity.ok(ApiResponse.success("Note deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}