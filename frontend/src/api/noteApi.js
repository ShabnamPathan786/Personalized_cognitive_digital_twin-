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

    // Toggle dashboard
    toggleDashboard: async (id) => {
        const response = await axios.patch(`/notes/${id}/dashboard`);
        return response.data;
    },

    // Delete note
    deleteNote: async (id) => {
        const response = await axios.delete(`/notes/${id}`);
        return response.data;
    },

    // Seed dummy data
    seedDummyData: async () => {
        const dummyNotes = [
            {
                title: 'Medical Alert: Allergies',
                content: 'Allergic to Penicillin and Sulfa drugs. Blood type is O-positive. Keep this information handy during any medical visits.',
                type: 'DOCUMENT',
                priority: 'HIGH',
                category: 'Medical',
                color: '#FCE7F3'
            },
            {
                title: 'Family Contacts',
                content: 'Daughter Sarah: (555) 123-4567\nSon Michael: (555) 987-6543\nDr. Smith (Neurologist): (555) 555-0199',
                type: 'PERSONAL',
                priority: 'URGENT',
                category: 'Contacts',
                color: '#FEF3C7'
            },
            {
                title: 'Favorite Memories',
                content: 'Summer vacations at the lake house in Michigan. Grandson Leo was born June 15, 2018. He loves fire trucks and dogs.',
                type: 'PERSONAL',
                priority: 'LOW',
                category: 'Memories',
                color: '#DBEAFE'
            },
            {
                title: 'House Key Location',
                content: 'The spare house key is hidden under the fake rock next to the front porch steps. The backdoor needs to be locked every night before bed.',
                type: 'PERSONAL',
                priority: 'MEDIUM',
                category: 'Home',
                color: '#D1FAE5'
            },
            {
                title: 'Weekly Grocery List Staples',
                content: '- Whole wheat bread\n- Skim milk\n- Bananas\n- Oatmeal\n- Decaf coffee\n- Chicken breast',
                type: 'OTHER',
                priority: 'LOW',
                category: 'Shopping',
                color: '#FED7AA'
            }
        ];

        for (const note of dummyNotes) {
            await axios.post('/notes', note);
        }
        return { success: true };
    }
};
