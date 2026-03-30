import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { emergencyApi } from '../api/emergencyApi';

const CaregiverEmergencyView = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [acknowledgingId, setAcknowledgingId] = useState(null);
    const [resolvingId, setResolvingId] = useState(null);

    useEffect(() => {
        fetchCaregiverAlerts();

        // Poll for new alerts every 5 seconds
        const interval = setInterval(fetchCaregiverAlerts, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchCaregiverAlerts = async () => {
        try {
            const response = await emergencyApi.getCaregiverAlerts();
            if (response.success) {
                const alertsData = Array.isArray(response.data) ? response.data : [];
                setAlerts(alertsData);
            }
        } catch (err) {
            console.error('Fetch caregiver alerts error:', err);
            setError('Failed to load emergency alerts');
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (alertId) => {
        setAcknowledgingId(alertId);
        try {
            const response = await emergencyApi.acknowledgeAlert(alertId);
            if (response.success) {
                setSuccess('✅ Alert acknowledged');

                // Update local state
                setAlerts(prev => prev.map(alert =>
                    alert.id === alertId
                        ? { ...alert, status: 'ACKNOWLEDGED' }
                        : alert
                ));

                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError('Failed to acknowledge alert');
        } finally {
            setAcknowledgingId(null);
        }
    };

    const handleResolve = async (alertId) => {
        if (!window.confirm('Mark this emergency as resolved?')) return;

        setResolvingId(alertId);
        try {
            const response = await emergencyApi.resolveAlert(alertId, 'Emergency resolved by caregiver');
            if (response.success) {
                setSuccess('✅ Alert resolved');

                // Remove from list
                setAlerts(prev => prev.filter(alert => alert.id !== alertId));

                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError('Failed to resolve alert');
        } finally {
            setResolvingId(null);
        }
    };

    const handleFalseAlarm = async (alertId) => {
        if (!window.confirm('Mark this as false alarm?')) return;

        try {
            // ✅ Use emergencyApi instead of raw axios (axios was never imported)
            const response = await emergencyApi.markAsFalseAlarm(alertId, 'Marked as false alarm by caregiver');

            if (response.success) {
                setSuccess('✅ Marked as false alarm');
                setAlerts(prev => prev.filter(alert => alert.id !== alertId));
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.message || 'Failed to mark as false alarm');
            }
        } catch (err) {
            setError('Failed to mark as false alarm');
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

    // Separate alerts by status
    const activeAlerts = alerts.filter(alert => alert.status === 'ACTIVE');
    const acknowledgedAlerts = alerts.filter(alert => alert.status === 'ACKNOWLEDGED');
    const resolvedAlerts = alerts.filter(alert => alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM');

    if (loading) {
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
                            <h1 className="text-2xl font-bold text-gray-900">🚨 Emergency Center (Caregiver)</h1>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Success/Error Messages */}
            {success && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                        {success}
                    </div>
                </div>
            )}

            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Active Alerts Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                        <span className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                        Active Alerts ({activeAlerts.length})
                    </h2>

                    {activeAlerts.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No active alerts</p>
                            <p className="text-gray-400 text-sm mt-2">All patients are safe</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-6 bg-white rounded-lg shadow-sm border-l-4 ${getStatusColor(alert.status)} transition-all hover:shadow-md`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                        <div className="flex-1">
                                            {/* Patient Info */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white">
                                                    {alert.patientName?.charAt(0) || 'P'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{alert.patientName}</h3>
                                                    <p className="text-xs text-gray-500">Patient ID: {alert.patientId}</p>
                                                </div>
                                            </div>

                                            {/* Alert Details */}
                                            <div className="space-y-2 text-sm text-gray-700">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getSeverityColor(alert.severity)}`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{getTimeSince(alert.createdAt)}</span>
                                                </div>

                                                <p><strong>Type:</strong> {alert.alertType?.replace(/_/g, ' ')}</p>

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

                                                <p><strong>Triggered:</strong> {formatDateTime(alert.createdAt)}</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                disabled={acknowledgingId === alert.id}
                                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                            >
                                                {acknowledgingId === alert.id ? 'Acknowledging...' : '👁️ Acknowledge'}
                                            </button>
                                            <button
                                                onClick={() => handleResolve(alert.id)}
                                                disabled={resolvingId === alert.id}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                            >
                                                {resolvingId === alert.id ? 'Resolving...' : '✓ Resolve'}
                                            </button>
                                            <button
                                                onClick={() => handleFalseAlarm(alert.id)}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                ⚠️ False Alarm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Acknowledged Alerts Section */}
                {acknowledgedAlerts.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                            <span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
                            Acknowledged Alerts ({acknowledgedAlerts.length})
                        </h2>
                        <div className="space-y-4">
                            {acknowledgedAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-6 bg-white rounded-lg shadow-sm border-l-4 ${getStatusColor(alert.status)}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">Patient: {alert.patientName}</p>
                                            <p className="text-sm text-gray-600">Type: {alert.alertType}</p>
                                            <p className="text-sm text-gray-500">{formatDateTime(alert.createdAt)}</p>
                                        </div>
                                        <span className="text-yellow-600 font-medium">Acknowledged</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Resolved Alerts */}
                {resolvedAlerts.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                            <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
                            Recently Resolved ({resolvedAlerts.length})
                        </h2>
                        <div className="space-y-2">
                            {resolvedAlerts.slice(0, 5).map((alert) => (
                                <div key={alert.id} className="bg-white rounded-lg shadow-sm p-4">
                                    <p className="font-medium">Patient: {alert.patientName}</p>
                                    <p className="text-sm text-gray-600">Resolved at: {formatDateTime(alert.resolvedAt)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CaregiverEmergencyView;
