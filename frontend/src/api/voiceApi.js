import axios from './axios';

/**
 * Voice API Service
 * Handles all voice-related API calls
 */
export const voiceApi = {
    /**
     * Process voice audio file (REST fallback)
     * @param {File} audioFile - Recorded audio file
     * @param {string} mode - 'standard' or 'dementia'
     * @returns {Promise}
     */
    processVoice: async (audioFile, mode = 'standard') => {
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('mode', mode);

        const response = await axios.post('/voice/process', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get voice interaction history
     * @returns {Promise}
     */
    getHistory: async () => {
        const response = await axios.get('/voice/history');
        return response.data;
    },

    /**
     * Get specific interaction by ID
     * @param {string} interactionId
     * @returns {Promise}
     */
    getInteraction: async (interactionId) => {
        const response = await axios.get(`/voice/interaction/${interactionId}`);
        return response.data;
    },

    /**
     * Cancel ongoing voice processing
     * @param {string} sessionId
     * @returns {Promise}
     */
    cancelProcessing: async (sessionId) => {
        const response = await axios.post(`/voice/cancel/${sessionId}`);
        return response.data;
    }
};