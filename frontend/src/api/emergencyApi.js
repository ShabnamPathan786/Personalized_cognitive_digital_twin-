import axios from './axios';

const getCurrentLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve('Location unavailable');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
                resolve(mapsLink);
            },
            (error) => {
                console.error('Location error:', error);
                resolve('Location unavailable');
            },
            {
                timeout: 5000,
                enableHighAccuracy: true,
                maximumAge: 0
            }
        );
    });
};

export const emergencyApi = {
    /**
     * Get all alerts for current user (patient)
     * Backend: GET /api/emergency-alerts
     */
    getAllAlerts: async () => {
        try {
            const response = await axios.get('/emergency-alerts');
            console.log('📥 All Alerts Response:', response.data);
            // response.data is ApiResponse { success, message, data: [...] }
            return {
                success: true,
                data: response.data.data  // ✅ unwrap the actual array
            };
        } catch (error) {
            console.error('Get all alerts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch alerts',
                error: error
            };
        }
    },

    /**
     * Get active alerts for current patient
     * Backend: GET /api/emergency-alerts/active
     */
    getActiveAlerts: async () => {
        try {
            const response = await axios.get('/emergency-alerts/active');
            console.log('📥 Active Alerts Response:', response.data);
            return {
                success: true,
                data: response.data.data  // ✅ unwrap the actual array
            };
        } catch (error) {
            console.error('Get active alerts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch active alerts',
                error: error
            };
        }
    },

    /**
     * Get alerts for caregiver
     * Backend: GET /api/emergency-alerts/caregiver
     */
    getCaregiverAlerts: async () => {
        try {
            const response = await axios.get('/emergency-alerts/caregiver');
            console.log('📥 Caregiver Alerts Response:', response.data);
            return {
                success: true,
                data: response.data.data  // ✅ unwrap the actual array
            };
        } catch (error) {
            console.error('Get caregiver alerts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch caregiver alerts',
                error: error
            };
        }
    },

    /**
     * Create emergency alert (SOS button)
     * Backend: POST /api/emergency-alerts
     */
    triggerSOS: async (message, location = null) => {
        let actualLocation = location;
        if (!actualLocation) {
            try {
                actualLocation = await getCurrentLocation();
            } catch (err) {
                console.error('Failed to get location:', err);
                actualLocation = 'Location unavailable';
            }
        }

        try {
            const response = await axios.post('/emergency-alerts', {
                alertType: 'MANUAL_SOS',
                severity: 'CRITICAL',
                message: message || 'Emergency SOS triggered',
                location: actualLocation
            });

            console.log('📥 SOS Response:', response.data);
            return {
                success: true,
                data: response.data.data  // ✅ unwrap
            };
        } catch (error) {
            console.error('Trigger SOS error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send SOS alert',
                error: error
            };
        }
    },

    /**
     * Resolve alert
     * Backend: POST /api/emergency-alerts/{id}/resolve
     */
    resolveAlert: async (alertId, resolutionNotes = null) => {
        try {
            const response = await axios.post(`/emergency-alerts/${alertId}/resolve`, {
                resolutionNotes: resolutionNotes || "Resolved from dashboard"
            });

            console.log('📥 Resolve Response:', response.data);
            return {
                success: true,
                data: response.data.data  // ✅ unwrap
            };
        } catch (error) {
            console.error('Resolve alert error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to resolve alert',
                error: error
            };
        }
    },

    /**
     * Acknowledge alert
     * Backend: POST /api/emergency-alerts/{id}/acknowledge
     */
    acknowledgeAlert: async (alertId) => {
        try {
            const response = await axios.post(`/emergency-alerts/${alertId}/acknowledge`);
            return {
                success: true,
                data: response.data.data  // ✅ unwrap
            };
        } catch (error) {
            console.error('Acknowledge alert error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to acknowledge alert',
                error: error
            };
        }
    },

    /**
     * Mark alert as false alarm
     * Backend: POST /api/emergency-alerts/{id}/false-alarm
     */
    markAsFalseAlarm: async (alertId, notes = null) => {  // ✅ added missing method
        try {
            const response = await axios.post(`/emergency-alerts/${alertId}/false-alarm`, {
                resolutionNotes: notes || 'Marked as false alarm by caregiver'
            });
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('Mark false alarm error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to mark as false alarm',
                error: error
            };
        }
    }
};