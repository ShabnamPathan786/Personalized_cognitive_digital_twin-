import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [loadingCaregivers, setLoadingCaregivers] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showCaregivers, setShowCaregivers] = useState(false);
    const [error, setError] = useState('');

    // ✅ FIX: Replace alert() with inline toast state
    // alert() blocks the browser's main thread and freezes all JS execution
    // until the user dismisses it — terrible UX especially on mobile.
    // A timed inline toast is non-blocking and dismisses automatically.
    const [copyToast, setCopyToast] = useState('');
    const toastTimer = useRef(null);

    // Clean up toast timer on unmount
    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, []);

    const showCopyToast = (message) => {
        setCopyToast(message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setCopyToast(''), 2500);
    };

    const handleCopyId = async () => {
        try {
            await navigator.clipboard.writeText(user?.id);
            showCopyToast('✅ ID Copied!');
        } catch (err) {
            // Fallback for browsers that block clipboard without HTTPS
            showCopyToast('❌ Copy failed — please copy manually');
        }
    };

    useEffect(() => {
        if (user?.userType === 'CAREGIVER') {
            fetchPatients();
        }
    }, [user]);

    const fetchPatients = async () => {
        setLoadingPatients(true);
        setError('');
        try {
            const response = await axios.get('/connections/my-patients');
            if (response.data.success) setPatients(response.data.data);
        } catch (error) {
            console.error('Error fetching linked patients:', error);
            setError('Failed to load patient information. Please try again later.');
        } finally {
            setLoadingPatients(false);
        }
    };

    const fetchCaregivers = async () => {
        setLoadingCaregivers(true);
        setError('');
        try {
            const response = await axios.get('/connections/my-caregivers');
            if (response.data.success) {
                setCaregivers(Array.isArray(response.data.data) ? response.data.data : [response.data.data]);
                setShowCaregivers(true);
            }
        } catch (error) {
            console.error('Error fetching linked caregiver:', error);
            setError('Failed to load your caregiver information. Please try again later.');
        } finally {
            setLoadingCaregivers(false);
        }
    };

    const handleViewCaregivers = () => {
        if (!showCaregivers && caregivers.length === 0) {
            fetchCaregivers();
        } else {
            setShowCaregivers(!showCaregivers);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setError('Failed to logout. Please try again.');
            setLoading(false);
        }
    };

    const getUserTypeBadge = () => {
        switch (user?.userType) {
            case 'DEMENTIA_PATIENT':
                return { bg: 'bg-blue-600', text: 'text-white', icon: '👤', label: 'Patient', theme: 'bg-gray-50', accent: 'blue' };
            case 'CAREGIVER':
                return { bg: 'bg-green-600', text: 'text-white', icon: '👨‍⚕️', label: 'Caregiver', theme: 'bg-gray-50', accent: 'green' };
            case 'NORMAL':
                return { bg: 'bg-gray-700', text: 'text-white', icon: '👤', label: 'User', theme: 'bg-gray-50', accent: 'gray' };
            default:
                return { bg: 'bg-gray-600', text: 'text-white', icon: '👤', label: 'User', theme: 'bg-gray-50', accent: 'gray' };
        }
    };

    const badge = getUserTypeBadge();

    const FeatureCard = ({ icon, title, description, onClick, accent = 'blue' }) => {
        const accentColors = {
            blue: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
            green: 'border-green-200 hover:border-green-300 hover:bg-green-50',
            purple: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
            orange: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50',
            red: 'border-red-200 hover:border-red-300 hover:bg-red-50',
            amber: 'border-amber-200 hover:border-amber-300 hover:bg-amber-50',
            cyan: 'border-cyan-200 hover:border-cyan-300 hover:bg-cyan-50',
            indigo: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50',
            emerald: 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50'
        };

        return (
            <div
                onClick={onClick}
                className={`bg-white border-2 ${accentColors[accent] || 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'} rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md`}
            >
                <div className="flex items-start gap-3">
                    <div className="text-3xl">{icon}</div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 text-base">{title}</h3>
                        <p className="text-gray-600 text-sm">{description}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${badge.theme}`}>
            {/* ✅ FIX: Inline toast notification — fixed position, non-blocking */}
            {copyToast && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg transition-all duration-300">
                    {copyToast}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                                Digital Twin Dashboard
                            </h1>
                            <p className="text-gray-600">
                                Welcome back, {user?.fullName || user?.username}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-lg ${badge.bg} ${badge.text} text-sm font-medium flex items-center gap-1.5`}>
                                <span>{badge.icon}</span> {badge.label}
                            </span>
                            <button
                                onClick={handleLogout}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                                {loading ? 'Logging out...' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start">
                            <span className="text-red-600 mr-3">⚠️</span>
                            <div className="flex-1">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xl ml-4">×</button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="space-y-6">
                    {/* User Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg ${badge.bg} flex items-center justify-center text-xl text-white`}>
                                {badge.icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                    {user?.fullName || user?.username}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <span>📧</span>
                                        <span>{user?.email}</span>
                                    </div>
                                    {user?.phoneNumber && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <span>📱</span>
                                            <span>{user?.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========== CAREGIVER VIEW ========== */}
                    {user?.userType === 'CAREGIVER' && (
                        <>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">🆔</div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Your Caregiver ID</h3>
                                        <p className="text-xs text-gray-500">Share with patients to connect</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                                    <code className="flex-1 font-mono text-sm font-medium text-gray-800">
                                        {user?.id}
                                    </code>
                                    {/* ✅ FIX: Uses handleCopyId instead of alert() */}
                                    <button
                                        onClick={handleCopyId}
                                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span>👥</span> Linked Patients
                                </h3>
                                {loadingPatients ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-600">Loading patients...</p>
                                    </div>
                                ) : patients.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {patients.map((patient) => (
                                            <div key={patient.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-semibold text-white text-sm">
                                                        {patient.fullName?.charAt(0) || 'P'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-medium text-gray-900 text-sm truncate">{patient.fullName || 'No Name'}</h4>
                                                        <p className="text-xs text-gray-600 truncate">{patient.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs space-y-1">
                                                    <p className="text-gray-600">📱 {patient.phoneNumber || 'N/A'}</p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${patient.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {patient.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="text-4xl mb-2">👥</div>
                                        <p className="text-gray-600 text-sm font-medium">No patients linked yet</p>
                                        <p className="text-xs text-gray-500 mt-1">Share your caregiver ID to connect</p>
                                    </div>
                                )}
                            </div>

                            <FeatureCard
                                icon="👥"
                                title="HITL Review Queue"
                                description="Review pending user queries (Human-in-the-Loop)"
                                onClick={() => navigate('/hitl-dashboard')}
                                accent="purple"
                            />
                            <FeatureCard
                                icon="🚨"
                                title="Emergency Alerts"
                                description="View and manage patient emergencies"
                                onClick={() => navigate('/caregiver-emergency')}
                                accent="red"
                            />
                        </>
                    )}

                    {/* ========== DEMENTIA PATIENT VIEW ========== */}
                    {user?.userType === 'DEMENTIA_PATIENT' && (
                        <>
                            {(!user?.fullName || !user?.phoneNumber) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xl">⚠️</span>
                                                <h3 className="font-semibold text-amber-800">Complete Your Profile</h3>
                                            </div>
                                            <p className="text-sm text-amber-700">Setup your profile to access all features</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/profile-setup')}
                                            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Setup Now
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showCaregivers && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <span>👨‍⚕️</span> My Caregivers
                                        </h3>
                                        <button onClick={() => setShowCaregivers(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                                    </div>
                                    {loadingCaregivers ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                                            <p className="mt-2 text-sm text-gray-600">Loading caregivers...</p>
                                        </div>
                                    ) : caregivers.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {caregivers.map((caregiver, index) => (
                                                <div key={caregiver.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-semibold text-white text-sm">
                                                            {caregiver.fullName?.charAt(0) || 'C'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-medium text-gray-900 text-sm truncate">{caregiver.fullName || 'No Name'}</h4>
                                                            <p className="text-xs text-gray-600 truncate">{caregiver.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs space-y-1">
                                                        <p className="text-gray-600">📱 {caregiver.phoneNumber || 'N/A'}</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${caregiver.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                            {caregiver.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-4xl mb-2">👨‍⚕️</div>
                                            <p className="text-gray-600 text-sm font-medium">No caregiver assigned yet</p>
                                            <p className="text-xs text-gray-500 mt-1">Contact support to link a caregiver</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Health & Care</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FeatureCard icon="💊" title="Medications" description="Track your medications & get reminders" onClick={() => navigate('/medications')} accent="blue" />
                                    <FeatureCard icon="🚨" title="Emergency SOS" description="Quick access to emergency contacts" onClick={() => navigate('/emergency')} accent="red" />
                                    <FeatureCard icon="👨‍⚕️" title="My Caregivers" description={showCaregivers ? 'Hide caregiver details' : 'View your caregivers'} onClick={handleViewCaregivers} accent="green" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Digital Tools</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FeatureCard icon="📁" title="My Files" description="Store your important documents" onClick={() => navigate('/files')} accent="orange" />
                                    <FeatureCard icon="🤖" title="Simple Summaries" description="Get easy-to-understand summaries" onClick={() => navigate('/summarization')} accent="purple" />
                                    <FeatureCard icon="📝" title="My Notes" description="Keep track of important things" onClick={() => navigate('/notes')} accent="amber" />
                                    <FeatureCard icon="🎤" title="Voice Helper" description="Talk to your AI assistant" onClick={() => navigate('/voice-helper')} accent="cyan" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ========== NORMAL USER VIEW ========== */}
                    {user?.userType === 'NORMAL' && (
                        <>
                            <div className="bg-gray-700 rounded-xl shadow-sm p-5 text-white">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">👤</span>
                                    <div>
                                        <h3 className="font-semibold mb-0.5">Welcome to Digital Twin</h3>
                                        <p className="text-sm text-gray-200">Access your personal tools and features below</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Tools</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FeatureCard icon="📁" title="File Manager" description="Upload & organize your documents" onClick={() => navigate('/files')} accent="orange" />
                                    <FeatureCard icon="🤖" title="AI Summarization" description="Get smart document summaries" onClick={() => navigate('/summarization')} accent="purple" />
                                    <FeatureCard icon="📝" title="Notes" description="Your personal notes & reminders" onClick={() => navigate('/notes')} accent="amber" />
                                    <FeatureCard icon="🎤" title="Voice Assistant" description="Interact with AI via voice" onClick={() => navigate('/voice-helper')} accent="cyan" />
                                    <FeatureCard icon="⚡" title="More Features" description="Exciting features coming soon" onClick={() => { }} accent="indigo" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-gray-200">
                    <p className="text-center text-sm text-gray-500">
                        © 2024 Digital Twin Platform. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;