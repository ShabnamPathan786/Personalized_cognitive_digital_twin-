import React, { useState, useEffect, useRef } from 'react';
import { hitlApi } from '../api/hitlApi';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const HITLReviewDashboard = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [currentItem, setCurrentItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [reviewResponse, setReviewResponse] = useState('');
    const [reviewNotes, setReviewNotes] = useState('');
    const [rating, setRating] = useState(5);
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [stats, setStats] = useState(null);

    // ✅ FIX: Track when reviewer opened the item — not when they clicked submit
    const reviewStartTime = useRef(null);

    const { lastMessage } = useWebSocket('/topic/hitl');

    useEffect(() => {
        loadQueue();
        loadStats();
    }, [filter]);

    useEffect(() => {
        if (lastMessage) {
            // ✅ FIX: lastMessage is already a parsed object from useWebSocket —
            // calling JSON.parse(lastMessage.body) would throw since there is no .body
            const data = lastMessage;
            if (data.type === 'NEW_HITL_ITEM') {
                setQueue(prev => [data.item, ...prev]);
                playNotificationSound();
            } else if (data.type === 'QUEUE_UPDATE') {
                loadQueue();
            }
        }
    }, [lastMessage]);

    const playNotificationSound = () => {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const loadQueue = async () => {
        setLoading(true);
        try {
            const response = await hitlApi.getPendingQueue();
            if (response.success) {
                let filteredQueue = response.data || [];
                if (filter !== 'ALL') {
                    filteredQueue = filteredQueue.filter(item => item.priority === filter);
                }
                setQueue(filteredQueue);
            }
        } catch (err) {
            setError('Failed to load queue');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const [avgTimeRes, statsRes] = await Promise.all([
                hitlApi.getAverageReviewTime(),
                hitlApi.getReviewerStats()
            ]);

            setStats({
                avgTime: avgTimeRes.data?.avgTime || 0,
                reviewerStats: statsRes.data || []
            });
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const handleSelectItem = async (item) => {
        setCurrentItem(item);
        setReviewResponse('');
        setReviewNotes('');
        setRating(5);
        setAiSuggestion('');

        // ✅ FIX: Start the review timer when the reviewer opens the item
        reviewStartTime.current = new Date();

        try {
            await hitlApi.assignToReviewer(item.id);
        } catch (err) {
            console.error('Failed to assign item:', err);
        }
    };

    const handleResolveOffline = async () => {
        setSubmitting(true);
        setError('');

        try {
            const response = await hitlApi.resolveOffline(currentItem.id);

            if (response.success) {
                setSuccess('Marked as resolved offline!');
                setCurrentItem(null);
                reviewStartTime.current = null;
                loadQueue();
                loadStats();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resolve offline');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async (itemId, reason) => {
        if (!window.confirm('Are you sure you want to reject this item?')) return;

        try {
            await hitlApi.rejectItem(itemId, reason || 'Cannot answer');
            setSuccess('Item rejected');
            setCurrentItem(null);
            reviewStartTime.current = null;
            loadQueue();
        } catch (err) {
            setError('Failed to reject item');
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            CRITICAL: 'bg-red-600',
            HIGH: 'bg-orange-600',
            MEDIUM: 'bg-yellow-600',
            LOW: 'bg-blue-600'
        };
        return colors[priority] || 'bg-gray-600';
    };

    const getTimeAgo = (dateString) => {
        const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        return `${Math.floor(diff / 60)} hour(s) ago`;
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">👥 HITL Review Dashboard</h1>
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {user?.fullName || 'Reviewer'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600">
                                Queue: {queue.length} pending
                            </div>
                            <button
                                onClick={loadQueue}
                                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            {stats && (
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Average Review Time</p>
                            <p className="text-2xl font-bold">{Math.round(stats.avgTime)}s</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Your Reviews Today</p>
                            <p className="text-2xl font-bold">
                                {stats.reviewerStats?.find(s => s._id === user?.id)?.count || 0}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-500">Queue Status</p>
                            <p className="text-2xl font-bold">{queue.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex gap-6">
                    {/* Queue Sidebar */}
                    <div className="w-1/3 bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 border-b">
                            <h2 className="font-bold mb-3">Filter by Priority</h2>
                            <div className="flex flex-wrap gap-2">
                                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setFilter(p)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === p
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
                                    <p className="mt-2 text-sm text-gray-500">Loading queue...</p>
                                </div>
                            ) : queue.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p className="text-4xl mb-2">✅</p>
                                    <p>No pending items</p>
                                    <p className="text-sm mt-1">All caught up!</p>
                                </div>
                            ) : (
                                queue.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectItem(item)}
                                        className={`p-4 cursor-pointer transition hover:bg-gray-50 ${currentItem?.id === item.id
                                                ? 'bg-purple-50 border-l-4 border-purple-600'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}></span>
                                                <span className="font-medium text-sm">{item.userFullName}</span>
                                                <span className="text-xs text-gray-500">({item.userType})</span>
                                            </div>
                                            <span className="text-xs text-gray-400">{getTimeAgo(item.createdAt)}</span>
                                        </div>

                                        <p className="text-sm text-gray-800 mb-2 line-clamp-2">"{item.query}"</p>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full text-white ${getPriorityColor(item.priority)}`}>
                                                {item.priority}
                                            </span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                                                Score: {Math.round(item.confidenceScore)}%
                                            </span>
                                        </div>

                                        {item.confidenceReasons?.length > 0 && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                {item.confidenceReasons[0]}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Review Panel */}
                    <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
                        {currentItem ? (
                            <div>
                                <h3 className="text-lg font-bold mb-4">Review Item</h3>

                                {/* User Info */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium">{currentItem.userFullName}</p>
                                            <p className="text-sm text-gray-600">{currentItem.userEmail}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs text-white ${getPriorityColor(currentItem.priority)}`}>
                                            {currentItem.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">User Type: {currentItem.userType}</p>
                                </div>

                                {/* Query */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-1">User Query:</p>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-gray-800">"{currentItem.query}"</p>
                                    </div>
                                </div>

                                {/* Context */}
                                {currentItem.retrievedContext && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Retrieved Context:</p>
                                        <div className="bg-blue-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{currentItem.retrievedContext}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Confidence Reasons */}
                                {currentItem.confidenceReasons?.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Why AI is unsure:</p>
                                        <div className="bg-yellow-50 p-3 rounded-lg">
                                            <ul className="list-disc list-inside text-sm text-yellow-800">
                                                {currentItem.confidenceReasons.map((reason, i) => (
                                                    <li key={i}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Action: Resolve Offline */}
                                <div className="mt-8 bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                                    <p className="text-green-800 font-medium mb-2">📞 Contact the patient directly</p>
                                    <p className="text-sm text-green-700 mb-4">Patient Phone: <strong>{currentItem.userPhone || 'Not available'}</strong></p>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleResolveOffline}
                                            disabled={submitting}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition disabled:bg-gray-400"
                                        >
                                            {submitting ? 'Resolving...' : '✓ Mark as Resolved (Contacted Patient)'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(currentItem.id, 'Cannot answer')}
                                            className="px-6 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-3 rounded-lg font-medium transition"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                    <p className="text-xs text-green-600 mt-3">Clicking resolved will clear this item without speaking back to the patient via the voice assistant.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-12">
                                <p className="text-6xl mb-4">👈</p>
                                <p className="text-lg">Select an item from the queue to review</p>
                                <p className="text-sm mt-2">Click on any pending item to start reviewing</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HITLReviewDashboard;