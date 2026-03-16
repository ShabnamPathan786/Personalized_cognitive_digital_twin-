import axios from './axios';

/**
 * Profile API Service
 * Handles all profile-related operations
 */
export const profileApi = {
    /**
     * Complete user profile setup (for patients)
     * @param {Object} profileData - Profile completion data
     * @returns {Promise}
     */
    completeProfile: async (profileData) => {
        try {
            const response = await axios.put('/profile/complete', profileData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Complete profile error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to complete profile',
                error: error
            };
        }
    },

    /**
     * Get current user's profile
     * @returns {Promise}
     */
    getProfile: async () => {
        try {
            const response = await axios.get('/profile/me');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Get profile error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to get profile',
                error: error
            };
        }
    },

    /**
     * Update user profile (partial updates)
     * @param {Object} updates - Fields to update
     * @returns {Promise}
     */
    updateProfile: async (updates) => {
        try {
            const response = await axios.patch('/profile/update', updates);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to update profile',
                error: error
            };
        }
    }
};