import React, { useState, useEffect } from 'react';
import { useVoiceWebSocket } from '../hooks/useVoiceWebSocket';
import { useAuth } from '../contexts/AuthContext';

const VoiceHelper = () => {
    const { user } = useAuth();
    const {
        connected,
        transcription,
        response,
        waitingForReview,
        reviewId,
        error,
        isRecording,
        sessionId,  // ✅ This is coming from the hook
        startRecording,
        stopRecording,
        cancelRecording,
        setMode
    } = useVoiceWebSocket();

    const [mode, setLocalMode] = useState(
        user?.userType === 'DEMENTIA_PATIENT' ? 'dementia' : 'standard'
    );
    const [showTranscript, setShowTranscript] = useState(true);
    const [estimatedWait, setEstimatedWait] = useState(0);

    useEffect(() => {
        setMode(mode);
    }, [mode, setMode]);

    useEffect(() => {
        if (waitingForReview) {
            setEstimatedWait(300);
            const interval = setInterval(() => {
                setEstimatedWait(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [waitingForReview]);

    const formatWaitTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ✅ Safe access to sessionId
    const displaySessionId = sessionId ? sessionId.substring(0, 8) : '...';

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎤</span> Voice Assistant
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${connected
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                            {connected ? '● Connected' : '○ Disconnected'}
                        </span>
                        {user?.userType === 'DEMENTIA_PATIENT' && (
                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs">
                                Simple Mode
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Mode Selector (for non-dementia users) */}
            {user?.userType !== 'DEMENTIA_PATIENT' && (
                <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Response Mode:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLocalMode('standard')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'standard'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => setLocalMode('dementia')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'dementia'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Simple (Dementia)
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="p-6">
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                        <button
                            onClick={() => window.location.reload()}
                            className="ml-auto text-red-800 hover:text-red-900 font-medium"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Recording Button */}
                <div className="text-center mb-6">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!connected}
                        className={`relative w-32 h-32 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${!connected
                                ? 'bg-gray-400 cursor-not-allowed'
                                : isRecording
                                    ? 'bg-red-600 animate-pulse shadow-lg shadow-red-300'
                                    : 'bg-gradient-to-br from-blue-600 to-purple-600 hover:shadow-xl'
                            }`}
                    >
                        <span className="text-5xl text-white">
                            {isRecording ? '⏹️' : '🎤'}
                        </span>
                    </button>
                    <p className="mt-3 text-sm text-gray-600">
                        {!connected
                            ? 'Connecting...'
                            : isRecording
                                ? 'Recording... Click to stop'
                                : 'Click to start speaking'}
                    </p>
                    {isRecording && (
                        <button
                            onClick={cancelRecording}
                            className="mt-2 text-xs text-red-600 hover:text-red-800"
                        >
                            Cancel Recording
                        </button>
                    )}
                </div>

                {/* Waiting for Review */}
                {waitingForReview && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-600 border-t-transparent"></div>
                            <p className="text-yellow-800 font-medium">Connecting to human reviewer...</p>
                        </div>
                        <p className="text-sm text-yellow-700">
                            Estimated wait time: {formatWaitTime(estimatedWait)}
                        </p>
                        <p className="text-xs text-yellow-600 mt-2">
                            Review ID: {reviewId || 'N/A'}
                        </p>
                    </div>
                )}

                {/* Toggle Transcript */}
                {transcription && (
                    <div className="mb-3 flex justify-end">
                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            {showTranscript ? 'Hide' : 'Show'} Transcript
                        </button>
                    </div>
                )}

                {/* Transcription Display */}
                {showTranscript && transcription && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">You said:</p>
                        <p className="text-gray-800">"{transcription}"</p>
                    </div>
                )}

                {/* Response Display */}
                {response && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-600">🤖</span>
                            <p className="text-xs text-blue-500">Assistant:</p>
                            {response.reviewedBy && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
                                    Reviewed by Human
                                </span>
                            )}
                        </div>
                        <p className="text-blue-800">{response.textResponse}</p>

                        {/* Audio Player */}
                        {response.audioUrl && (
                            <audio controls className="w-full mt-3">
                                <source src={response.audioUrl} type="audio/mpeg" />
                                Your browser does not support audio playback.
                            </audio>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
                    >
                        📝 Toggle Transcript
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
                    >
                        🔄 Reset Connection
                    </button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-center text-gray-400 mt-4">
                    Session ID: {displaySessionId}
                </p>
            </div>
        </div>
    );
};

export default VoiceHelper;