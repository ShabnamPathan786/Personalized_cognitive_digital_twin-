import axios from './axios';

export const authApi = {
    // Register new user
    register: async (userData) => {
        try {
            const response = await axios.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Login user
    login: async (credentials) => {
        try {
            const response = await axios.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw error
        }
    },

    // Logout user
    logout: async () => {
        try {
            const response = await axios.post('/auth/logout');
            return response.data;
        } catch (error) {
            throw error
        }
    },

    // Get current user
    getCurrentUser: async () => {
        try {
            const response = await axios.get('/auth/me');
            return response.data;
        } catch (error) {
            throw error
        }
    },

    // Check session
    checkSession: async () => {
        try {
            const response = await axios.get('/auth/session');
            return response.data;
        } catch (error) {
            throw error
        }
    },

    // Update profile
    updateProfile: async (profileData) => {
        try {
            const response = await axios.put('/auth/profile', profileData);
            return response.data;
        } catch (error) {
            throw error
        }
    },
};