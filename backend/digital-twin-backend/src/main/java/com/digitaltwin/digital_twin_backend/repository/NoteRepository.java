package com.digitaltwin.digital_twin_backend.repository;

import com.digitaltwin.digital_twin_backend.model.Note;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NoteRepository extends MongoRepository<Note, String> {

    List<Note> findByUserId(String userId);

    List<Note> findByUserIdAndArchivedOrderByCreatedAtDesc(String userId, boolean archived);

    // FIX: Use Note.NoteType enum directly, not String
    List<Note> findByUserIdAndTypeAndArchivedOrderByCreatedAtDesc(String userId, Note.NoteType type, boolean archived);

    List<Note> findByUserIdAndPinned(String userId, boolean pinned);

    List<Note> findByUserIdAndCategory(String userId, String category);

    List<Note> findByUserIdAndCreatedAtBetween(String userId, LocalDateTime start, LocalDateTime end);


    List<Note> findByUserIdAndContentContainingIgnoreCaseOrUserIdAndTitleContainingIgnoreCase(
            String userId1, String content,
            String userId2, String title
    );

    @Query("{ 'userId': ?0, $text: { $search: ?1 } }")
    List<Note> searchByText(String userId, String searchText);
    
    @Query("{ 'userId': ?0, 'type': ?1, 'createdAt': { $gte: ?2, $lt: ?3 } }")
    List<Note> findByUserIdAndTypeAndDateRange(String userId, Note.NoteType type, LocalDateTime start, LocalDateTime end);
}