import axios from './axios';

export const fileApi = {
    // ==================== FILE MANAGEMENT ====================

    /**
     * Upload file
     * @param {File} file - The file to upload
     * @param {string} description - Optional description
     * @returns {Promise} Response with uploaded file data
     */
    uploadFile: async (file, description = '') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', description);

        const response = await axios.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get all files for current user
     * @returns {Promise} Response with array of files
     */
    getAllFiles: async () => {
        const response = await axios.get('/files');
        return response.data;
    },

    /**
     * Get files by category
     * @param {string} category - Category: PDF, IMAGE, AUDIO, VIDEO, DOCUMENT, OTHER
     * @returns {Promise} Response with filtered files
     */
    getFilesByCategory: async (category) => {
        const response = await axios.get(`/files/category/${category}`);
        return response.data;
    },

    /**
     * Get file by ID
     * @param {string} fileId - File ID
     * @returns {Promise} Response with file data
     */
    getFileById: async (fileId) => {
        const response = await axios.get(`/files/${fileId}`);
        return response.data;
    },

    /**
     * Download file
     * @param {string} fileId - File ID
     * @param {string} fileName - Original file name for download
     * @returns {Promise} Blob data
     */
    downloadFile: async (fileId, fileName) => {
        const response = await axios.get(`/files/${fileId}/download`, {
            responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return response.data;
    },

    /**
     * Delete file
     * @param {string} fileId - File ID
     * @returns {Promise} Response confirming deletion
     */
    deleteFile: async (fileId) => {
        const response = await axios.delete(`/files/${fileId}`);
        return response.data;
    },

    // ==================== AI SUMMARIZATION ====================

    /**
     * Summarize PDF file
     * @param {string} fileId - File ID
     * @param {Object} options - Summarization options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save summary as note (default: true)
     * @returns {Promise} Response with summary text
     */
    summarizePDF: async (fileId, options = {}) => {
        const { mode = 'standard', saveAsNote = true } = options;

        const response = await axios.post(
            `/files/summarize/pdf/${fileId}`,
            null,
            {
                params: { mode, saveAsNote }
            }
        );
        return response.data;
    },

    /**
     * Summarize audio file (with transcription)
     * @param {string} fileId - File ID
     * @param {Object} options - Summarization options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save summary as note (default: true)
     * @param {boolean} options.saveTranscription - Save transcription as note (default: true)
     * @returns {Promise} Response with transcription and summary
     */
    summarizeAudio: async (fileId, options = {}) => {
        const { mode = 'standard', saveAsNote = true, saveTranscription = true } = options;

        const response = await axios.post(
            `/files/summarize/audio/${fileId}`,
            null,
            {
                params: { mode, saveAsNote, saveTranscription }
            }
        );
        return response.data;
    },

    /**
     * Summarize video file (extracts audio and transcribes)
     * @param {string} fileId - File ID
     * @param {Object} options - Summarization options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save summary as note (default: true)
     * @param {boolean} options.saveTranscription - Save transcription as note (default: true)
     * @returns {Promise} Response with transcription and summary
     */
    summarizeVideo: async (fileId, options = {}) => {
        const { mode = 'standard', saveAsNote = true, saveTranscription = true } = options;

        const response = await axios.post(
            `/files/summarize/video/${fileId}`,
            null,
            {
                params: { mode, saveAsNote, saveTranscription }
            }
        );
        return response.data;
    },

    /**
     * Summarize plain text
     * @param {string} text - Text to summarize
     * @param {string} mode - "standard" or "dementia" (default: "standard")
     * @returns {Promise} Response with summary
     */
    summarizeText: async (text, mode = 'standard') => {
        const response = await axios.post('/files/summarize/text', {
            text,
            mode
        });
        return response.data;
    },

    /**
     * Summarize YouTube Video
     * @param {string} url - YouTube URL
     * @param {Object} options - Summarization options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save summary as note (default: true)
     * @param {boolean} options.saveTranscription - Save transcription as note (default: true)
     * @returns {Promise} Response with transcription and summary
     */
    summarizeYouTube: async (url, options = {}) => {
        const { mode = 'standard', saveAsNote = true, saveTranscription = true } = options;

        const response = await axios.post('/files/summarize/youtube', {
            url,
            mode,
            saveAsNote,
            saveTranscription
        });
        return response.data;
    },

    /**
     * Get cached summary for a file
     * @param {string} fileId - File ID
     * @returns {Promise} Response with cached summary
     */
    getCachedSummary: async (fileId) => {
        const response = await axios.get(`/files/summarize/file/${fileId}`);
        return response.data;
    },

    /**
     * Batch summarize multiple files (PDF, Audio, Video)
     * @param {Array<string>} fileIds - Array of file IDs
     * @param {Object} options - Batch options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save summaries as notes (default: true)
     * @returns {Promise} Response with batch processing results
     */
    batchSummarize: async (fileIds, options = {}) => {
        const { mode = 'standard', saveAsNote = true } = options;

        const response = await axios.post('/files/summarize/batch', {
            fileIds,
            mode,
            saveAsNote
        });
        return response.data;
    },

    /**
     * Regenerate summary for a file
     * @param {string} fileId - File ID
     * @param {Object} options - Regeneration options
     * @param {string} options.mode - "standard" or "dementia" (default: "standard")
     * @param {boolean} options.saveAsNote - Save new summary as note (default: false)
     * @returns {Promise} Response with new summary
     */
    regenerateSummary: async (fileId, options = {}) => {
        const { mode = 'standard', saveAsNote = false } = options;

        const response = await axios.post(
            `/files/summarize/regenerate/${fileId}`,
            null,
            {
                params: { mode, saveAsNote }
            }
        );
        return response.data;
    },

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Format file size to human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension
     */
    getFileExtension: (filename) => {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    },

    /**
     * Validate file type
     * @param {File} file - File object
     * @param {Array<string>} allowedTypes - Array of allowed MIME types
     * @returns {boolean} True if valid
     */
    validateFileType: (file, allowedTypes) => {
        return allowedTypes.includes(file.type);
    },

    /**
     * Validate file size
     * @param {File} file - File object
     * @param {number} maxSizeMB - Maximum size in MB
     * @returns {boolean} True if valid
     */
    validateFileSize: (file, maxSizeMB) => {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    },

    /**
     * Get file category icon
     * @param {string} category - File category
     * @returns {string} Emoji icon
     */
    getCategoryIcon: (category) => {
        const icons = {
            PDF: '📄',
            IMAGE: '🖼️',
            AUDIO: '🎵',
            VIDEO: '🎥',
            DOCUMENT: '📝',
            OTHER: '📎'
        };
        return icons[category] || '📎';
    },

    /**
     * Get file type color
     * @param {string} category - File category
     * @returns {string} Tailwind color class
     */
    getCategoryColor: (category) => {
        const colors = {
            PDF: 'text-red-500',
            IMAGE: 'text-green-500',
            AUDIO: 'text-purple-500',
            VIDEO: 'text-blue-500',
            DOCUMENT: 'text-yellow-500',
            OTHER: 'text-gray-500'
        };
        return colors[category] || 'text-gray-500';
    },

    /**
     * Check if file can be summarized
     * @param {Object} file - File object with category
     * @returns {boolean} True if file is PDF, AUDIO, or VIDEO
     */
    canSummarize: (file) => {
        return file.category === 'PDF' ||
            file.category === 'AUDIO' ||
            file.category === 'VIDEO';
    },

    /**
     * Get summarization method for file
     * @param {Object} file - File object with category
     * @returns {string} Method name: 'pdf', 'audio', 'video', or null
     */
    getSummarizationMethod: (file) => {
        const methodMap = {
            'PDF': 'pdf',
            'AUDIO': 'audio',
            'VIDEO': 'video'
        };
        return methodMap[file.category] || null;
    },

    /**
     * Download multiple files as ZIP (requires backend support)
     * @param {Array<string>} fileIds - Array of file IDs
     * @param {string} zipName - Name for the ZIP file
     * @returns {Promise} Blob data
     */
    downloadMultipleFiles: async (fileIds, zipName = 'files.zip') => {
        // Note: This requires a backend endpoint that creates a ZIP
        // This is a placeholder for future implementation
        console.warn('Batch download not yet implemented on backend');

        // Alternative: Download files one by one
        for (const fileId of fileIds) {
            try {
                const file = await fileApi.getFileById(fileId);
                if (file.success) {
                    await fileApi.downloadFile(fileId, file.data.originalFileName);
                    // Add delay to avoid overwhelming the browser
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Failed to download file ${fileId}:`, error);
            }
        }
    },

    /**
     * Upload multiple files
     * @param {Array<File>} files - Array of files to upload
     * @param {Function} onProgress - Progress callback (optional)
     * @returns {Promise<Array>} Array of upload responses
     */
    uploadMultipleFiles: async (files, onProgress = null) => {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const response = await fileApi.uploadFile(files[i]);
                results.push({ success: true, data: response });

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: files.length,
                        percentage: Math.round(((i + 1) / files.length) * 100)
                    });
                }
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    fileName: files[i].name
                });
            }
        }

        return results;
    },

    // ==================== CONSTANTS ====================

    /**
     * File upload configuration
     */
    config: {
        MAX_FILE_SIZE_MB: 100,
        ALLOWED_FILE_TYPES: [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',

            // Audio
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/m4a',
            'audio/flac',

            // Video
            'video/mp4',
            'video/avi',
            'video/mov',
            'video/wmv',
            'video/webm',
            'video/mkv'
        ],

        FILE_CATEGORIES: {
            PDF: 'PDF',
            IMAGE: 'IMAGE',
            AUDIO: 'AUDIO',
            VIDEO: 'VIDEO',
            DOCUMENT: 'DOCUMENT',
            OTHER: 'OTHER'
        },

        SUMMARY_MODES: {
            STANDARD: 'standard',
            DEMENTIA: 'dementia'
        }
    }
};

// Export as default as well for flexibility
export default fileApi;