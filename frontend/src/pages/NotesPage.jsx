import { useState, useEffect } from 'react';
import { noteApi } from '../api/noteApi';
import { medicationApi } from '../api/medicationApi';
import { routineApi } from '../api/routineApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NotesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notes, setNotes] = useState([]);
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [filterType, setFilterType] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPinned, setShowPinned] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [selectedDay, setSelectedDay] = useState(
        new Date().toLocaleDateString('en-US', { weekday: 'long' })
    );

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'PERSONAL',
        priority: 'MEDIUM',
        category: '',
        color: '#FEF3C7',
        daysOfWeek: [] // ADDED: to support routine days
    });

    useEffect(() => {
        loadNotes();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [notes, filterType, searchQuery, showPinned, showArchived, selectedDay]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const [regularResponse, archivedResponse, medsResponse, routinesResponse] = await Promise.all([
                noteApi.getAllNotes().catch(() => ({ success: true, data: [] })),
                noteApi.getArchivedNotes().catch(() => ({ success: true, data: [] })),
                medicationApi.getAllMedications().catch(() => ({ success: true, data: [] })),
                routineApi.getAllRoutines().catch(() => ({ success: true, data: [] }))
            ]);

            let combinedNotes = [];
            
            if (regularResponse.success) combinedNotes.push(...(regularResponse.data || []));
            if (archivedResponse.success) combinedNotes.push(...(archivedResponse.data || []));

            // Map Medications to Notes format
            if (medsResponse && medsResponse.data) {
                const medNotes = medsResponse.data.map(med => ({
                    id: `med-${med.id}`,
                    title: `Medication: ${med.name}`,
                    content: `${med.dosage} - ${med.instructions || 'No special instructions.'}\nScheduled Times: ${med.scheduledTimes ? med.scheduledTimes.join(', ') : 'Not set'}`,
                    type: 'MEDICAL',
                    priority: 'HIGH',
                    category: 'Medication',
                    color: '#DBEAFE', // Blue
                    createdAt: med.createdAt,
                    pinned: true, // Always pin medications
                    archived: false,
                    isExternal: true, // Mark to prevent editing/deleting from Notes UI
                    daysOfWeek: med.daysOfWeek || []
                }));
                combinedNotes.push(...medNotes);
            }

            // Map Routines to Notes format
            if (routinesResponse && routinesResponse.data) {
                const routineNotes = routinesResponse.data.map(r => ({
                    id: `routine-${r.id}`,
                    title: `${r.activityName}`,
                    content: `${r.description || ''}\nTime: ${r.scheduledTime}\nDuration: ${r.durationMinutes} mins`,
                    type: 'ROUTINE',
                    priority: r.reminderEnabled ? 'HIGH' : 'MEDIUM',
                    category: 'Daily Routine',
                    color: '#D1FAE5', // Green
                    createdAt: r.createdAt,
                    pinned: false,
                    archived: false,
                    isExternal: true,
                    daysOfWeek: r.daysOfWeek || []
                }));
                combinedNotes.push(...routineNotes);
            }

            setNotes(combinedNotes);
        } catch (error) {
            console.error('Failed to load notes:', error);
            setError('Failed to load notes data');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...notes];

        // Filter by type
        if (filterType !== 'ALL') {
            if (filterType === 'ROUTINE') {
                // For Routine view, show routines, medications AND reminders
                filtered = filtered.filter(note => {
                    if (note.type !== 'ROUTINE' && note.type !== 'MEDICAL' && note.type !== 'REMINDER') return false;
                    
                    if (note.type === 'REMINDER') {
                        const noteDay = new Date(note.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
                        return noteDay === selectedDay;
                    }

                    // If it's a medication and has no specific days, assume it's daily
                    if (note.type === 'MEDICAL' && (!note.daysOfWeek || note.daysOfWeek.length === 0)) {
                        return true;
                    }
                    
                    return note.daysOfWeek && note.daysOfWeek.includes(selectedDay);
                });
            } else {
                filtered = filtered.filter(note => note.type === filterType);
            }
        }

        // Filter pinned/archived (Skip for Routine view to keep it clean)
        if (filterType !== 'ROUTINE') {
            if (showPinned) {
                filtered = filtered.filter(note => note.pinned);
            }
            if (showArchived) {
                filtered = filtered.filter(note => note.archived);
            } else {
                filtered = filtered.filter(note => !note.archived);
            }
        }

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query) ||
                (note.category && note.category.toLowerCase().includes(query))
            );
        }

        // Sort: pinned first, then by date
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        setFilteredNotes(filtered);
    };

    const handleCreateNote = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if(!user){
                setError("User not found!")
                return;
            }
            console.log("user:",user)
            const response = await noteApi.createNote(formData);
            if (response.success) {
                setSuccess('✅ Note created successfully!');
                setShowCreateModal(false);
                resetForm();
                loadNotes();
            }
        } catch (error) {
            setError(error.message || 'Failed to create note');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNote = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await noteApi.updateNote(selectedNote.id, formData);
            if (response.success) {
                setSuccess('✅ Note updated successfully!');
                setShowEditModal(false);
                resetForm();
                loadNotes();
            }
        } catch (error) {
            setError('Failed to update note');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePin = async (noteId) => {
        try {
            await noteApi.togglePin(noteId);
            loadNotes();
        } catch (error) {
            setError('Failed to pin/unpin note');
        }
    };

    const handleToggleArchive = async (noteId) => {
        try {
            await noteApi.toggleArchive(noteId);
            setSuccess('Note archived/unarchived');
            loadNotes();
        } catch (error) {
            setError('Failed to archive note');
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;

        try {
            await noteApi.deleteNote(noteId);
            setSuccess('Note deleted successfully');
            loadNotes();
        } catch (error) {
            setError('Failed to delete note');
        }
    };

    const extractTime = (content, createdAt) => {
        // Look for "Time: 10:00" or "Scheduled Times: 10:00" or just a HH:mm pattern
        const timeMatch = content.match(/(?:Time:|Times:)\s*(\d{1,2}:\d{2})/i) || content.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) return timeMatch[1];
        if (createdAt) {
            return new Date(createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        }
        return '00:00';
    };

    const handleLogTaken = async (note) => {
        if (!window.confirm('Mark this medication as taken?')) return;
        try {
            const medId = note.id.replace('med-', '');
            await medicationApi.logMedicationTaken(medId);
            setSuccess('Medication logged as taken!');
            // We don't necessarily need to reload notes here unless we show status, but good for consistency
            loadNotes();
        } catch (error) {
            setError('Failed to log medication');
        }
    };

    const handleRoutineDone = async (note) => {
        if (!window.confirm('Mark this routine as done?')) return;
        try {
            const routineId = note.id.replace('routine-', '');
            await routineApi.logRoutineCompleted(routineId);
            setSuccess('Routine marked as completed! 🎉');
            loadNotes();
        } catch (error) {
            setError('Failed to mark routine as done');
        }
    };

    const openEditModal = (note) => {
        setSelectedNote(note);
        setFormData({
            title: note.title,
            content: note.content,
            type: note.type,
            priority: note.priority,
            category: note.category || '',
            color: note.color || '#FEF3C7',
            daysOfWeek: note.daysOfWeek || []
        });
        setShowEditModal(true);
    };

    const openViewModal = (note) => {
        setSelectedNote(note);
        setShowViewModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            type: 'PERSONAL',
            priority: 'MEDIUM',
            category: '',
            color: '#FEF3C7',
            daysOfWeek: []
        });
        setSelectedNote(null);
    };

    const getTypeIcon = (type) => {
        const icons = {
            SUMMARY: '🤖',
            PERSONAL: '📝',
            MEDICAL: '⚕️',
            REMINDER: '⏰',
            DOCUMENT: '📄',
            ROUTINE: '📅',
            OTHER: '📌'
        };
        return icons[type] || '📌';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            LOW: 'text-gray-500',
            MEDIUM: 'text-blue-500',
            HIGH: 'text-orange-500',
            URGENT: 'text-red-600'
        };
        return colors[priority] || 'text-gray-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/home')}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">📝 My Notes</h1>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium"
                        >
                            + New Note
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex justify-between items-center">
                        {error}
                        <button onClick={() => setError('')} className="text-red-800 font-bold">×</button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex justify-between items-center">
                        {success}
                        <button onClick={() => setSuccess('')} className="text-green-800 font-bold">×</button>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <input
                                type="text"
                                placeholder="🔍 Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>

                        {/* Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="ALL">All Types</option>
                            <option value="SUMMARY">🤖 AI Summaries</option>
                            <option value="PERSONAL">📝 Personal</option>
                            <option value="MEDICAL">⚕️ Medical</option>
                            <option value="REMINDER">⏰ Reminders</option>
                            <option value="DOCUMENT">📄 Documents</option>
                            <option value="ROUTINE">📅 Routine</option>
                            <option value="OTHER">📌 Other</option>
                        </select>

                        {/* Quick Filters */}
                        {filterType !== 'ROUTINE' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPinned(!showPinned)}
                                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${showPinned
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    📌 Pinned
                                </button>
                                <button
                                    onClick={() => setShowArchived(!showArchived)}
                                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${showArchived
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    📦 Archived
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Day Selector for Routine */}
                    {filterType === 'ROUTINE' && (
                        <div className="mt-6 flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-6 py-2 rounded-full whitespace-nowrap font-bold transition-all shadow-sm ${
                                        selectedDay === day 
                                        ? 'bg-amber-600 text-white shadow-md transform scale-105' 
                                        : 'bg-orange-100 text-amber-800 hover:bg-orange-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    )}


                    <div className="mt-3 text-sm text-gray-600">
                        Showing {filteredNotes.length} of {notes.length} notes
                    </div>
                </div>

                {/* Notes Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading notes...</p>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 mb-4">No notes found</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
                        >
                            Create Your First Note
                        </button>
                    </div>
                ) : filterType === 'ROUTINE' ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {[...filteredNotes].sort((a, b) => {
                            const timeA = extractTime(a.content, a.createdAt);
                            const timeB = extractTime(b.content, b.createdAt);
                            return timeA.localeCompare(timeB);
                        }).map((note) => (
                            <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition">
                                <div className="text-center min-w-[80px]">
                                    <div className="text-lg font-bold text-gray-900">{extractTime(note.content, note.createdAt)}</div>
                                    <div className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-1">
                                        {note.type === 'MEDICAL' ? 'Med' : note.type === 'REMINDER' ? 'Remind' : 'Routine'}
                                    </div>
                                </div>
                                
                                <div className={`w-2 h-14 rounded-full flex-shrink-0 ${note.type === 'MEDICAL' ? 'bg-blue-400' : note.type === 'REMINDER' ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg truncate">{note.title}</h3>
                                    <p className="text-gray-600 text-sm line-clamp-2 mt-1">{note.content.split('\n')[0]}</p>
                                </div>
                                
                                <div className="flex-shrink-0">
                                    {note.type === 'MEDICAL' ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleLogTaken(note); }}
                                            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-sm transition shadow-sm"
                                        >
                                            ✓ Taken
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRoutineDone(note); }}
                                            className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg font-bold text-sm transition shadow-sm"
                                        >
                                            ✓ Done
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                onClick={() => openViewModal(note)}
                                className="rounded-lg p-4 shadow-md hover:shadow-xl transition relative cursor-pointer transform hover:-translate-y-1"
                                style={{ backgroundColor: note.color || '#FEF3C7' }}
                            >
                                {/* Pin Icon */}
                                {note.pinned && (
                                    <div className="absolute top-2 right-2">
                                        <span className="text-red-500 text-xl">📌</span>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-start gap-2 mb-3">
                                    <span className="text-2xl">{getTypeIcon(note.type)}</span>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">
                                            {note.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                            <span className="bg-white/50 px-2 py-0.5 rounded">
                                                {note.type}
                                            </span>
                                            <span className={`font-medium ${getPriorityColor(note.priority)}`}>
                                                {note.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <p className="text-gray-800 text-sm mb-3 line-clamp-4">
                                    {note.content}
                                </p>

                                {/* Category */}
                                {note.category && (
                                    <div className="mb-3">
                                        <span className="inline-block bg-white/70 text-gray-700 text-xs px-2 py-1 rounded">
                                            🏷️ {note.category}
                                        </span>
                                    </div>
                                )}

                                {/* Source File */}
                                {note.sourceFileName && (
                                    <div className="mb-3 text-xs text-gray-600">
                                        📎 From: {note.sourceFileName}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                    {note.archived && (
                                        <span className="bg-gray-200 px-2 py-0.5 rounded">Archived</span>
                                    )}
                                </div>

                                {/* Actions */}
                                {!note.isExternal && (
                                    <div className="flex gap-2 relative z-10 pt-2 border-t border-black/5 mt-auto">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(note); }}
                                            className="flex-1 bg-white/50 hover:bg-white text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition shadow-sm"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id); }}
                                            title={note.pinned ? "Unpin" : "Pin"}
                                            className="bg-white/50 hover:bg-white text-gray-700 px-3 py-1.5 rounded text-sm transition shadow-sm"
                                        >
                                            {note.pinned ? '📌' : '📍'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleArchive(note.id); }}
                                            title={note.archived ? "Unarchive" : "Archive"}
                                            className="bg-white/50 hover:bg-white text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition flex items-center justify-center shadow-sm"
                                        >
                                            {note.archived ? '📤' : '📥'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                            title="Delete"
                                            className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm transition shadow-sm"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                                {note.isExternal && (
                                    <div className="flex gap-2 relative z-10 pt-2 border-t border-black/5 mt-auto">
                                        <div className="text-xs text-gray-500 italic flex-1 text-center py-1">
                                            Managed externally (Medication/Routine)
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* View Note Modal */}
            {showViewModal && selectedNote && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm transition-opacity">
                    <div 
                        className="rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative animate-fadeIn" 
                        style={{ backgroundColor: selectedNote.color || '#FEF3C7' }}
                    >
                        {/* Decorative top border */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-black/10 rounded-t-2xl"></div>
                        
                        <div className="flex justify-between items-start mb-6 pt-2">
                            <div className="flex items-start gap-4">
                                <span className="text-4xl bg-white/50 p-3 rounded-xl shadow-sm">{getTypeIcon(selectedNote.type)}</span>
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-2">
                                        {selectedNote.title}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                                        <span className="bg-white/60 px-3 py-1 rounded-full font-bold shadow-sm">
                                            {selectedNote.type}
                                        </span>
                                        <span className={`font-bold bg-white/60 px-3 py-1 rounded-full shadow-sm ${getPriorityColor(selectedNote.priority)}`}>
                                            {selectedNote.priority}
                                        </span>
                                        {selectedNote.category && (
                                            <span className="font-bold bg-white/60 px-3 py-1 rounded-full shadow-sm">
                                                🏷️ {selectedNote.category}
                                            </span>
                                        )}
                                        <span className="text-xs ml-2 opacity-70 font-medium">
                                            {new Date(selectedNote.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    if (!showEditModal) setSelectedNote(null);
                                }}
                                className="text-gray-500 hover:text-gray-900 text-4xl leading-none transition-transform hover:scale-110 p-2"
                            >
                                ×
                            </button>
                        </div>

                        <div className="bg-white/70 rounded-2xl p-6 mb-6 shadow-inner border border-white/40 min-h-[200px]">
                            <p className="text-gray-800 whitespace-pre-wrap text-[1.05rem] leading-relaxed font-medium">
                                {selectedNote.content}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            {selectedNote.sourceFileName ? (
                                <div className="text-sm text-gray-700 font-bold bg-white/50 px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm">
                                    📎 Source: {selectedNote.sourceFileName}
                                </div>
                            ) : <div></div>}
                            
                            {!selectedNote.isExternal && (
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        openEditModal(selectedNote);
                                    }}
                                    className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-2.5 rounded-xl font-bold transition shadow-md hover:shadow-lg border border-gray-100 flex items-center gap-2"
                                >
                                    ✏️ Edit Note
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {showEditModal ? '✏️ Edit Note' : '➕ Create Note'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={showEditModal ? handleUpdateNote : handleCreateNote} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    required
                                    placeholder="Enter note title..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Content *
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    rows="6"
                                    required
                                    placeholder="Enter your note..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="PERSONAL">📝 Personal</option>
                                        <option value="MEDICAL">⚕️ Medical</option>
                                        <option value="REMINDER">⏰ Reminder</option>
                                        <option value="DOCUMENT">📄 Document</option>
                                        <option value="ROUTINE">📅 Routine</option>
                                        <option value="OTHER">📌 Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Show Day Selection if type is ROUTINE */}
                            {formData.type === 'ROUTINE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Day
                                    </label>
                                    <select
                                        value={formData.daysOfWeek && formData.daysOfWeek.length > 0 ? formData.daysOfWeek[0] : ''}
                                        onChange={(e) => setFormData({ ...formData, daysOfWeek: [e.target.value] })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="" disabled>Choose a day...</option>
                                        <option value="Monday">Monday</option>
                                        <option value="Tuesday">Tuesday</option>
                                        <option value="Wednesday">Wednesday</option>
                                        <option value="Thursday">Thursday</option>
                                        <option value="Friday">Friday</option>
                                        <option value="Saturday">Saturday</option>
                                        <option value="Sunday">Sunday</option>
                                    </select>
                                </div>
                            )}



                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color
                                </label>
                                <div className="flex gap-2">
                                    {['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#FED7AA', '#E9D5FF'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-10 h-10 rounded-lg border-2 ${formData.color === color ? 'border-gray-900' : 'border-gray-300'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 font-medium disabled:bg-gray-400"
                                >
                                    {loading ? 'Saving...' : showEditModal ? 'Update Note' : 'Create Note'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesPage;
