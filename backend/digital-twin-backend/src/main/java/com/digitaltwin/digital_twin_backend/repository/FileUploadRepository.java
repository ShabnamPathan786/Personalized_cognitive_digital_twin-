package com.digitaltwin.digital_twin_backend.repository;


import com.digitaltwin.digital_twin_backend.model.FileUpload;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * File Upload Repository
 */
@Repository
public interface FileUploadRepository extends MongoRepository<FileUpload, String> {

    /**
     * Find all files by user ID
     */
    List<FileUpload> findByUserId(String userId);

    /**
     * Find files by category
     */
    List<FileUpload> findByUserIdAndCategory(String userId, FileUpload.FileCategory category);


    List<FileUpload> findByProcessedFalse();


    List<FileUpload> findByUserIdAndProcessed(String userId, boolean processed);
}
