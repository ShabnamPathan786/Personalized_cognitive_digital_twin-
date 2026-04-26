import api from './axios';

export const routineApi = {
    getAllRoutines: async () => {
        const response = await api.get('/routines');
        return response.data;
    },

    getRoutineById: async (id) => {
        const response = await api.get(`/routines/${id}`);
        return response.data;
    },

    createRoutine: async (routineData) => {
        const response = await api.post('/routines', routineData);
        return response.data;
    },

    updateRoutine: async (id, routineData) => {
        const response = await api.put(`/routines/${id}`, routineData);
        return response.data;
    },

    deleteRoutine: async (id) => {
        const response = await api.delete(`/routines/${id}`);
        return response.data;
    },

    seedDummyData: async () => {
        const response = await api.post('/routines/seed');
        return response.data;
    },

    logRoutineCompleted: async (id) => {
        const response = await api.post(`/routines/${id}/log-completed`, {});
        return response.data;
    }
};
