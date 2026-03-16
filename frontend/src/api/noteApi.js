import axios from './axios';

export const noteApi = {
    // Get all notes
    getAllNotes: async () => {
        const response = await axios.get('/notes');
        return response.data;
    },

    // Get notes by type
    getNotesByType: async (type) => {
        const response = await axios.get(`/notes/type/${type}`);
        return response.data;
    },

    // Get pinned notes
    getPinnedNotes: async () => {
        const response = await axios.get('/notes/pinned');
        return response.data;
    },

    // Get archived notes
    getArchivedNotes: async () => {
        const response = await axios.get('/notes/archived');
        return response.data;
    },

    // Search notes
    searchNotes: async (query) => {
        const response = await axios.get(`/notes/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },

    // Get note by ID
    getNoteById: async (id) => {
        const response = await axios.get(`/notes/${id}`);
        return response.data;
    },

    // Create note
    createNote: async (note) => {
        const response = await axios.post('/notes', note);
        return response.data;
    },

    // Update note
    updateNote: async (id, note) => {
        const response = await axios.put(`/notes/${id}`, note);
        return response.data;
    },

    // Toggle pin
    togglePin: async (id) => {
        const response = await axios.patch(`/notes/${id}/pin`);
        return response.data;
    },

    // Toggle archive
    toggleArchive: async (id) => {
        const response = await axios.patch(`/notes/${id}/archive`);
        return response.data;
    },

    // Delete note
    deleteNote: async (id) => {
        const response = await axios.delete(`/notes/${id}`);
        return response.data;
    },
};