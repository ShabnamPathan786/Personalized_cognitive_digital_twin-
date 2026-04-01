import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { emergencyApi } from '../api/emergencyApi';

const EmergencyPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [triggering, setTriggering] = useState(false);
    const [sosMessage, setSosMessage] = useState('');
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [locationPermission, setLocationPermission] = useState('unknown');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Force refresh function
    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        console.log('🔄 Component mounted, fetching data...');
        loadAllData();
        checkLocationPermission();

        // Poll every 3 seconds for updates
        const interval = setInterval(() => {
            console.log('🔄 Polling for active alerts...');
            loadActiveAlerts();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Load all data function
    const loadAllData = async () => {
        setLoading(true);
        try {
            await loadActiveAlerts();
            await loadAllAlerts();
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load active alerts - THIS IS THE KEY FUNCTION
    const loadActiveAlerts = async () => {
        try {
            console.log('📡 Fetching active alerts...');
            const response = await emergencyApi.getActiveAlerts();
            console.log('📦 Active alerts response:', response);

            if (response.success) {
                // Extract the data array
                const activeData = response.data;
                console.log('🔥 Active data:', activeData);
                console.log('🔥 Active count:', activeData?.length);

                // CRITICAL: Set the state directly
                if (activeData && Array.isArray(activeData)) {
                    setActiveAlerts(activeData);
                    console.log('✅ Active alerts set to state:', activeData.length);
                } else {
                    console.log('⚠️ No active alerts or invalid format');
                    setActiveAlerts([]);
                }
            } else {
                console.log('❌ Failed to fetch active alerts');
                setActiveAlerts([]);
            }
        } catch (err) {
            console.error('Error fetching active alerts:', err);
            setActiveAlerts([]);
        }
    };

    // Load all alerts
    const loadAllAlerts = async () => {
        try {
            const response = await emergencyApi.getAllAlerts();
            if (response.success) {
                const allData = Array.isArray(response.data) ? response.data : [];
                setAlerts(allData);
                console.log('📊 All alerts loaded:', allData.length);
            }
        } catch (err) {
            console.error('Error fetching all alerts:', err);
        }
    };

    const checkLocationPermission = async () => {
        if (!navigator.geolocation) {
            setLocationPermission('unavailable');
            return;
        }

        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            setLocationPermission(permission.state);
            permission.onchange = () => setLocationPermission(permission.state);
        } catch (err) {
            setLocationPermission('unknown');
        }
    };

    const handleSOSClick = () => {
        setShowConfirmModal(true);
        setSosMessage('');
    };

    const confirmSOS = async () => {
        if (triggering) return;

        setTriggering(true);
        setError('');
        setSuccess('');

        try {
            let location = null;
            if (locationPermission === 'granted' && navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 5000,
                            enableHighAccuracy: true,
                            maximumAge: 0
                        });
                    });

                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    location = `https://maps.google.com/?q=${lat},${lng}`;
                } catch (err) {
                    console.error('Location error:', err);
                }
            }

            const response = await emergencyApi.triggerSOS(sosMessage, location);

            if (response.success) {
                setSuccess('🚨 Emergency Alert Sent!');
                setShowConfirmModal(false);
                setSosMessage('');

                // Load active alerts after SOS
                setTimeout(() => {
                    loadActiveAlerts();
                }, 1000);

                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(response.message || 'Failed to send alert');
                setTimeout(() => setError(''), 5000);
            }
        } catch (err) {
            setError('Failed to send alert');
            setTimeout(() => setError(''), 7000);
        } finally {
            setTriggering(false);
        }
    };

    const handleResolve = async (alertId) => {
        if (!window.confirm('Mark this emergency as resolved?')) return;

        try {
            const response = await emergencyApi.resolveAlert(alertId, 'Emergency resolved by patient');

            if (response.success) {
                setSuccess('✅ Emergency alert resolved');

                // Remove from active alerts immediately
                setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));

                // Also fetch fresh data
                setTimeout(() => {
                    loadActiveAlerts();
                }, 500);

                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.message || 'Failed to resolve alert');
                setTimeout(() => setError(''), 5000);
            }
        } catch (err) {
            setError('Failed to resolve alert');
            setTimeout(() => setError(''), 5000);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid date';
        }
    };

    const getTimeSince = (dateString) => {
        if (!dateString) return '';
        try {
            const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            return `${Math.floor(diffHours / 24)} day(s) ago`;
        } catch (e) {
            return '';
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            CRITICAL: 'bg-red-600',
            HIGH: 'bg-orange-600',
            MEDIUM: 'bg-yellow-600',
            LOW: 'bg-blue-600'
        };
        return colors[severity] || 'bg-gray-600';
    };

    const getStatusColor = (status) => {
        const colors = {
            ACTIVE: 'border-red-500 bg-red-50',
            ACKNOWLEDGED: 'border-yellow-500 bg-yellow-50',
            RESOLVED: 'border-green-500 bg-green-50',
            FALSE_ALARM: 'border-gray-500 bg-gray-50'
        };
        return colors[status] || 'border-gray-300';
    };

    // Log current state on each render
    console.log('🎨 Rendering EmergencyPage');
    console.log('🔥 activeAlerts in render:', activeAlerts);
    console.log('🔥 activeAlerts length:', activeAlerts?.length);
    console.log('📊 alerts in render:', alerts?.length);

    // Loading state
    if (loading && !activeAlerts?.length) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading emergency alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/home')}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                ← Back
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">🚨 Emergency Center</h1>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Messages */}
            {success && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                        {success}
                    </div>
                </div>
            )}

            {error && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                </div>
            )}

            {/* ACTIVE ALERTS BANNER - Will show if there are active alerts */}
            {activeAlerts && activeAlerts.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 animate-pulse">
                        <div className="flex items-center">
                            <span className="text-red-600 text-2xl mr-3">⚠️</span>
                            <div>
                                <h3 className="font-bold text-red-900">Active Emergency Alerts</h3>
                                <p className="text-sm text-red-700">
                                    You have {activeAlerts.length} active emergency alert{activeAlerts.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* SOS Button */}
                <div className="text-center mb-12">
                    <button
                        onClick={handleSOSClick}
                        disabled={triggering}
                        className="relative w-64 h-64 mx-auto bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-full shadow-2xl transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-white text-5xl font-bold">SOS</span>
                    </button>
                    <p className="mt-4 text-sm text-gray-600">
                        This will notify all your caregivers
                    </p>
                </div>

                {/* ACTIVE ALERTS LIST */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">📋 Active Alerts {activeAlerts?.length ? `(${activeAlerts.length})` : ''}</h3>

                    {!activeAlerts || activeAlerts.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No active alerts</p>
                            <p className="text-gray-400 text-sm mt-2">All clear! No emergencies at the moment.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-6 bg-white rounded-lg shadow-sm border-l-4 ${getStatusColor(alert.status)} transition-all hover:shadow-md`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {/* Status and Time */}
                                            <div className="flex items-center flex-wrap gap-2 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-red-600`}>
                                                    {alert.status}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getSeverityColor(alert.severity)}`}>
                                                    {alert.severity}
                                                </span>
                                                <span className="text-sm text-gray-500">{getTimeSince(alert.createdAt)}</span>
                                            </div>

                                            {/* Alert Details */}
                                            <div className="space-y-2 text-sm text-gray-700">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <p><strong>Type:</strong> {alert.alertType?.replace(/_/g, ' ')}</p>
                                                    <p><strong>Triggered:</strong> {formatDateTime(alert.createdAt)}</p>
                                                </div>

                                                {alert.message && alert.message !== 'Emergency SOS triggered' && (
                                                    <p className="bg-gray-50 p-2 rounded">
                                                        <strong>Message:</strong> "{alert.message}"
                                                    </p>
                                                )}

                                                {alert.location && alert.location !== 'Location unavailable' && (
                                                    <p>
                                                        <strong>Location:</strong>{' '}
                                                        {alert.location.startsWith('https://') ? (
                                                            <a
                                                                href={alert.location}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:text-blue-800 underline"
                                                            >
                                                                View on Google Maps
                                                            </a>
                                                        ) : (
                                                            alert.location
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolve Button */}
                                        <button
                                            onClick={() => handleResolve(alert.id)}
                                            className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                        >
                                            ✓ Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Debug Info - Remove after fixing */}
                <div className="text-xs text-gray-400 border-t pt-4 mt-8">
                    <p>Debug: Active Alerts Count: {activeAlerts?.length || 0}</p>
                    <p>Last Updated: {new Date().toLocaleTimeString()}</p>
                    <button
                        onClick={loadActiveAlerts}
                        className="text-blue-600 hover:underline mt-2"
                    >
                        ↻ Manual Refresh
                    </button>
                </div>
            </main>

            {/* SOS Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">🚨 Confirm Emergency</h3>
                        <p className="text-sm text-gray-600 mb-4">This will immediately alert all your caregivers</p>

                        <textarea
                            value={sosMessage}
                            onChange={(e) => setSosMessage(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500"
                            placeholder="Describe the emergency (optional)"
                            rows="3"
                            maxLength={200}
                        />

                        <div className="text-xs text-gray-500 mb-4">
                            {sosMessage.length}/200 characters
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={confirmSOS}
                                disabled={triggering}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
                            >
                                {triggering ? 'Sending...' : '🚨 Send SOS Now'}
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={triggering}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmergencyPage;
