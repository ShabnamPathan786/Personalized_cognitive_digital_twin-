import { useState, useEffect } from 'react';
import { routineApi } from '../api/routineApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
    { value: 'MORNING_ROUTINE', label: '🌅 Morning Routine', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'HYGIENE', label: '🚿 Hygiene', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    { value: 'MEALS', label: '🍽️ Meals', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { value: 'EXERCISE', label: '🏃 Exercise', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'SOCIAL', label: '👥 Social', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    { value: 'MEDICATION', label: '💊 Medication', color: 'bg-red-100 text-red-800 border-red-200' },
    { value: 'RECREATION', label: '🎮 Recreation', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { value: 'BEDTIME', label: '🌙 Bedtime', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { value: 'APPOINTMENTS', label: '📅 Appointments', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'OTHER', label: '📌 Other', color: 'bg-gray-100 text-gray-800 border-gray-200' }
];

const RoutinePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [selectedDay, setSelectedDay] = useState(
        new Date().toLocaleDateString('en-US', { weekday: 'long' })
    );

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        activityName: '',
        description: '',
        category: 'MORNING_ROUTINE',
        scheduledTime: '08:00',
        durationMinutes: 30,
        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        reminderEnabled: true,
        reminderMinutesBefore: 15,
        active: true
    });

    useEffect(() => {
        loadRoutines();
    }, []);

    const loadRoutines = async () => {
        setLoading(true);
        try {
            const response = await routineApi.getAllRoutines();
            if (response.success) {
                setRoutines(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load routines:', error);
            setError('Failed to load routines');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRoutine = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (formData.daysOfWeek.length === 0) {
                throw new Error("Please select at least one day for the routine.");
            }

            // Convert scheduledTime string (HH:mm) to the format expected by backend if needed
            // Currently assuming the backend accepts "HH:mm" directly for LocalTime
            const payload = {
                ...formData,
                scheduledTime: formData.scheduledTime.length === 5 ? `${formData.scheduledTime}:00` : formData.scheduledTime
            };

            if (editingRoutine) {
                await routineApi.updateRoutine(editingRoutine.id, payload);
                setSuccess('✅ Routine updated successfully!');
            } else {
                await routineApi.createRoutine(payload);
                setSuccess('✅ Routine created successfully!');
            }

            setShowModal(false);
            resetForm();
            loadRoutines();
        } catch (error) {
            setError(error.message || 'Failed to save routine');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRoutine = async (id) => {
        if (!window.confirm('Are you sure you want to delete this routine?')) return;
        try {
            await routineApi.deleteRoutine(id);
            setSuccess('Routine deleted successfully');
            loadRoutines();
        } catch (error) {
            setError('Failed to delete routine');
        }
    };

    const handleLogCompleted = async (id) => {
        try {
            await routineApi.logRoutineCompleted(id);
            setSuccess('🎉 Routine marked as completed!');
            loadRoutines();
        } catch (error) {
            setError('Failed to mark routine as completed');
        }
    };

    const handleSeedData = async () => {
        if (!window.confirm('This will add standard dementia care routines to your schedule. Continue?')) return;
        setLoading(true);
        try {
            await routineApi.seedDummyData();
            setSuccess('Professional routines added to your schedule!');
            loadRoutines();
        } catch (error) {
            setError('Failed to seed dummy data');
            setLoading(false);
        }
    };

    const openEditModal = (routine) => {
        setEditingRoutine(routine);
        setFormData({
            activityName: routine.activityName,
            description: routine.description || '',
            category: routine.category,
            scheduledTime: routine.scheduledTime.substring(0, 5), // 'HH:mm'
            durationMinutes: routine.durationMinutes,
            daysOfWeek: routine.daysOfWeek || [],
            reminderEnabled: routine.reminderEnabled,
            reminderMinutesBefore: routine.reminderMinutesBefore,
            active: routine.active
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingRoutine(null);
        setFormData({
            activityName: '',
            description: '',
            category: 'MORNING_ROUTINE',
            scheduledTime: '08:00',
            durationMinutes: 30,
            daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            reminderEnabled: true,
            reminderMinutesBefore: 15,
            active: true
        });
    };

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }));
    };

    // Filter routines for the selected day and sort by time
    const displayRoutines = routines
        .filter(r => r.daysOfWeek.includes(selectedDay))
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const getCategoryStyle = (catValue) => {
        const cat = CATEGORIES.find(c => c.value === catValue);
        return cat ? cat.color : 'bg-gray-100 text-gray-800 border-gray-200';
    };
    
    const getCategoryLabel = (catValue) => {
        const cat = CATEGORIES.find(c => c.value === catValue);
        return cat ? cat.label : 'Other';
    };

    // Check if a routine was completed today
    const isCompletedToday = (routine) => {
        if (!routine.logs || routine.logs.length === 0) return false;
        const today = new Date().toDateString();
        return routine.logs.some(log => 
            log.status === 'COMPLETED' && 
            new Date(log.completedDateTime).toDateString() === today
        );
    };

    const getTodaySchedulerLog = (routine, status) => {
        if (!routine.logs || routine.logs.length === 0) return null;
        const today = new Date().toDateString();

        return routine.logs
            .filter(log =>
                log.status === status &&
                log.scheduledDateTime &&
                new Date(log.scheduledDateTime).toDateString() === today
            )
            .sort((a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime))[0] || null;
    };

    const getRoutineNotificationStatus = (routine, isToday) => {
        if (!isToday || isCompletedToday(routine)) return null;

        const missedLog = getTodaySchedulerLog(routine, 'MISSED');
        if (missedLog) {
            return {
                type: 'alert',
                text: 'Alert sent to user and caregiver for missed routine',
                className: 'bg-red-50 text-red-700 border-red-200'
            };
        }

        const reminderLog = getTodaySchedulerLog(routine, 'PENDING');
        if (reminderLog?.notes === 'Reminder sent by scheduler') {
            return {
                type: 'reminder',
                text: 'Reminder sent to user',
                className: 'bg-blue-50 text-blue-700 border-blue-200'
            };
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100">
            {/* Header */}
            <header className="bg-white shadow-md border-b border-teal-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/home')}
                                className="text-teal-600 hover:text-teal-900 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                📅 Daily Routine Tracker
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {routines.length === 0 && (
                                <button
                                    onClick={handleSeedData}
                                    className="bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl hover:bg-emerald-200 font-bold transition shadow-sm border border-emerald-200 flex items-center gap-2"
                                >
                                    <span>🌱 Seed Examples</span>
                                </button>
                            )}
                            <button
                                onClick={() => { resetForm(); setShowModal(true); }}
                                className="bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 font-bold transition shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <span>+ Add Routine</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 flex justify-between items-center shadow-sm">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError('')} className="text-red-900 font-bold text-xl hover:scale-110 transition">×</button>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-emerald-700 flex justify-between items-center shadow-sm">
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} className="text-emerald-900 font-bold text-xl hover:scale-110 transition">×</button>
                    </div>
                )}

                {/* Day Selector */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-8 border border-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🗓️</span> Select Day
                    </h2>
                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                        {DAYS_OF_WEEK.map(day => {
                            const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-6 py-3 rounded-xl whitespace-nowrap font-bold transition-all ${
                                        selectedDay === day 
                                        ? 'bg-teal-600 text-white shadow-lg transform scale-105' 
                                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-100'
                                    }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span>{day.substring(0, 3)}</span>
                                        {isToday && <span className="text-[10px] uppercase tracking-wider mt-1 opacity-80">Today</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Routines Timeline */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 min-h-[400px] border border-white">
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        {selectedDay}'s Schedule
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full ml-auto">
                            {displayRoutines.length} {displayRoutines.length === 1 ? 'Task' : 'Tasks'}
                        </span>
                    </h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-teal-600 mb-4"></div>
                            <p className="text-teal-800 font-medium">Loading schedule...</p>
                        </div>
                    ) : displayRoutines.length === 0 ? (
                        <div className="text-center py-20 bg-teal-50/50 rounded-2xl border border-dashed border-teal-200">
                            <div className="text-6xl mb-4 opacity-50">✨</div>
                            <h3 className="text-xl font-bold text-teal-900 mb-2">No routines scheduled</h3>
                            <p className="text-teal-600 mb-6">You have a free day! Or, you can add a new routine.</p>
                            <button
                                onClick={() => { resetForm(); setShowModal(true); }}
                                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium transition shadow-md"
                            >
                                Add Routine for {selectedDay}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-teal-200 before:to-transparent">
                            {displayRoutines.map((routine, index) => {
                                const completed = isCompletedToday(routine);
                                const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === selectedDay;
                                const notificationStatus = getRoutineNotificationStatus(routine, isToday);
                                
                                return (
                                    <div key={routine.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Timeline Dot */}
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md z-10 ${
                                            completed ? 'bg-emerald-500' : (!routine.active ? 'bg-gray-400' : 'bg-teal-500')
                                        }`}>
                                            {completed ? '✓' : '⏱️'}
                                        </div>
                                        
                                        {/* Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl shadow-sm border border-gray-100 bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-black text-gray-900">{routine.scheduledTime.substring(0, 5)}</span>
                                                    <span className="text-xs font-bold text-gray-500">{routine.durationMinutes} min</span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border ${getCategoryStyle(routine.category)}`}>
                                                    {getCategoryLabel(routine.category)}
                                                </span>
                                            </div>
                                            
                                            <h3 className={`text-lg font-bold mb-1 ${!routine.active ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                {routine.activityName}
                                            </h3>
                                            
                                            {routine.description && (
                                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{routine.description}</p>
                                            )}

                                            {notificationStatus && (
                                                <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-bold ${notificationStatus.className}`}>
                                                    {notificationStatus.text}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(routine)}
                                                        className="text-xs font-bold text-gray-500 hover:text-teal-600 transition bg-gray-50 hover:bg-teal-50 px-3 py-1.5 rounded-lg"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteRoutine(routine.id)}
                                                        className="text-xs font-bold text-gray-500 hover:text-red-600 transition bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                                
                                                {isToday && routine.active && (
                                                    <button
                                                        onClick={() => handleLogCompleted(routine.id)}
                                                        disabled={completed}
                                                        className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-sm ${
                                                            completed 
                                                            ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-80' 
                                                            : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                                                        }`}
                                                    >
                                                        {completed ? '✓ Completed Today' : 'Mark Done'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        {/* Decorative Top */}
                        <div className="h-4 bg-gradient-to-r from-teal-400 to-emerald-500 w-full rounded-t-3xl absolute top-0 left-0"></div>
                        
                        <div className="p-8 pt-10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                                    {editingRoutine ? '✏️ Edit Routine' : '✨ New Routine'}
                                </h2>
                                <button
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>

                            <form onSubmit={handleSaveRoutine} className="space-y-6">
                                {/* Name & Time Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Activity Name *</label>
                                        <input
                                            type="text"
                                            value={formData.activityName}
                                            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-colors font-medium"
                                            required
                                            placeholder="e.g. Morning Walk"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Time *</label>
                                            <input
                                                type="time"
                                                value={formData.scheduledTime}
                                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-colors font-medium"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Duration (min)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.durationMinutes}
                                                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-colors font-medium"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Category *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {CATEGORIES.map(cat => (
                                            <div
                                                key={cat.value}
                                                onClick={() => setFormData({ ...formData, category: cat.value })}
                                                className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${
                                                    formData.category === cat.value
                                                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200 shadow-sm'
                                                    : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="text-xl mb-1">{cat.label.split(' ')[0]}</div>
                                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{cat.label.split(' ').slice(1).join(' ')}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-colors font-medium resize-none"
                                        rows="3"
                                        placeholder="Add any helpful instructions or notes..."
                                    />
                                </div>

                                {/* Days of Week */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                                        <span>Repeat Days *</span>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, daysOfWeek: formData.daysOfWeek.length === 7 ? [] : DAYS_OF_WEEK})}
                                            className="text-xs text-teal-600 hover:text-teal-800 font-bold"
                                        >
                                            {formData.daysOfWeek.length === 7 ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                                    formData.daysOfWeek.includes(day)
                                                    ? 'bg-teal-600 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {day.substring(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reminder & Active Toggles */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-800">Enable Reminder</p>
                                            <p className="text-xs text-gray-500 mt-1">Get notified before start</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={formData.reminderEnabled}
                                                onChange={(e) => setFormData({...formData, reminderEnabled: e.target.checked})}
                                            />
                                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-800">Routine Active</p>
                                            <p className="text-xs text-gray-500 mt-1">Temporarily disable</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={formData.active}
                                                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                                            />
                                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                        className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : (editingRoutine ? 'Save Changes' : 'Create Routine')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutinePage;
