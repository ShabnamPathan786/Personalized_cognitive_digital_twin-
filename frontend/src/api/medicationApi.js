import axios from './axios';

export const medicationApi = {
  // Get all medications for current user
  getAllMedications: async () => {
    const response = await axios.get('/medications');
    return response.data;
  },

  // Get medication by ID
  getMedicationById: async (medicationId) => {
    const response = await axios.get(`/medications/${medicationId}`);
    return response.data;
  },

  // Create new medication
  createMedication: async (medicationData) => {
    const response = await axios.post('/medications', medicationData);
    return response.data;
  },

  // Update medication
  updateMedication: async (medicationId, medicationData) => {
    const response = await axios.put(`/medications/${medicationId}`, medicationData);
    return response.data;
  },

  // Delete medication
  deleteMedication: async (medicationId) => {
    const response = await axios.delete(`/medications/${medicationId}`);
    return response.data;
  },

  // Log medication taken
  logMedicationTaken: async (medicationId) => {
    const response = await axios.post(`/medications/${medicationId}/log-taken`, {});
    return response.data;
  },

  // Get upcoming medications
  getUpcomingMedications: async () => {
    const response = await axios.get('/medications/upcoming');
    return response.data;
  },

  // Get medication history/logs
  getMedicationLogs: async (medicationId) => {
    const response = await axios.get(`/medications/${medicationId}/logs`);
    return response.data;
  },
};