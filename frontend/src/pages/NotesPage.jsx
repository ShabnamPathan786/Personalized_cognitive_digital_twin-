import { useState, useEffect } from 'react';
import { noteApi } from '../api/noteApi';
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

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'PERSONAL',
        priority: 'MEDIUM',
        category: '',
        color: '#FEF3C7'
    });

    useEffect(() => {
        loadNotes();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [notes, filterType, searchQuery, showPinned, showArchived]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const response = await noteApi.getAllNotes();
            if (response.success) {
                setNotes(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...notes];

        // Filter by type
        if (filterType !== 'ALL') {
            filtered = filtered.filter(note => note.type === filterType);
        }

        // Filter pinned/archived
        if (showPinned) {
            filtered = filtered.filter(note => note.pinned);
        }
        if (showArchived) {
            filtered = filtered.filter(note => note.archived);
        } else {
            filtered = filtered.filter(note => !note.archived);
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

    const openEditModal = (note) => {
        setSelectedNote(note);
        setFormData({
            title: note.title,
            content: note.content,
            type: note.type,
            priority: note.priority,
            category: note.category || '',
            color: note.color || '#FEF3C7'
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            type: 'PERSONAL',
            priority: 'MEDIUM',
            category: '',
            color: '#FEF3C7'
        });
        setSelectedNote(null);
    };

    const getTypeIcon = (type) => {
        const icons = {
            SUMMARY: '🤖',
            PERSONAL: '📝',
            MEDICAL: '⚕️',
            REMINDER: '⏰',
            VOICE_NOTE: '🎤',
            DOCUMENT: '📄',
            EMERGENCY: '🚨',
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
                            <option value="VOICE_NOTE">🎤 Voice Notes</option>
                            <option value="DOCUMENT">📄 Documents</option>
                            <option value="EMERGENCY">🚨 Emergency</option>
                            <option value="OTHER">📌 Other</option>
                        </select>

                        {/* Quick Filters */}
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
                    </div>

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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-lg p-4 shadow-md hover:shadow-lg transition relative"
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
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(note)}
                                        className="flex-1 bg-white/50 hover:bg-white/80 text-gray-700 px-3 py-1 rounded text-sm font-medium transition"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleTogglePin(note.id)}
                                        className="bg-white/50 hover:bg-white/80 text-gray-700 px-3 py-1 rounded text-sm transition"
                                    >
                                        {note.pinned ? '📌' : '📍'}
                                    </button>
                                    <button
                                        onClick={() => handleToggleArchive(note.id)}
                                        className="bg-white/50 hover:bg-white/80 text-gray-700 px-3 py-1 rounded text-sm transition"
                                    >
                                        📦
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="bg-red-500/50 hover:bg-red-500/80 text-white px-3 py-1 rounded text-sm transition"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

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
                                        <option value="VOICE_NOTE">🎤 Voice Note</option>
                                        <option value="DOCUMENT">📄 Document</option>
                                        <option value="EMERGENCY">🚨 Emergency</option>
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="e.g., Work, Health, Personal..."
                                />
                            </div>

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
