import axios from './axios';

/**
 * HITL API Service
 * Handles all Human-in-the-Loop operations for reviewers
 */
export const hitlApi = {
    /**
     * Get pending HITL queue items
     * @returns {Promise}
     */
    getPendingQueue: async () => {
        const response = await axios.get('/hitl/queue/pending');
        return response.data;
    },

    /**
     * Get specific queue item by ID
     * @param {string} itemId
     * @returns {Promise}
     */
    getQueueItem: async (itemId) => {
        const response = await axios.get(`/hitl/queue/${itemId}`);
        return response.data;
    },

    /**
     * Assign item to current reviewer
     * @param {string} itemId
     * @returns {Promise}
     */
    assignToReviewer: async (itemId) => {
        const response = await axios.post(`/hitl/queue/${itemId}/assign`);
        return response.data;
    },

    /**
     * Generate AI suggestion for query
     * @param {Object} data - { query, context, userType }
     * @returns {Promise}
     */
    generateSuggestion: async (data) => {
        const response = await axios.post('/hitl/suggest', data);
        return response.data;
    },

    /**
     * Submit review response
     * @param {string} itemId
     * @param {Object} data - { response, notes, timeToReview, rating }
     * @returns {Promise}
     */
    submitReview: async (itemId, data) => {
        const response = await axios.post(`/hitl/queue/${itemId}/review`, data);
        return response.data;
    },

    /**
     * Reject item (can't answer)
     * @param {string} itemId
     * @param {string} reason
     * @returns {Promise}
     */
    rejectItem: async (itemId, reason) => {
        const response = await axios.post(`/hitl/queue/${itemId}/reject`, { reason });
        return response.data;
    },

    /**
     * Get reviewer statistics
     * @returns {Promise}
     */
    getReviewerStats: async () => {
        const response = await axios.get('/hitl/stats/reviewers');
        return response.data;
    },

    /**
     * Get average review time
     * @returns {Promise}
     */
    getAverageReviewTime: async () => {
        const response = await axios.get('/hitl/stats/avg-time');
        return response.data;
    }
};