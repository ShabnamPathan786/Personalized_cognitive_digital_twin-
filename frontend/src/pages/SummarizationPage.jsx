import { useState, useEffect } from 'react';
import { fileApi } from '../api/fileApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SummarizationPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summarizing, setSummarizing] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [textSummary, setTextSummary] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('pdf'); // 'pdf', 'audio', 'video', 'text'
    const [summaryMode, setSummaryMode] = useState(
        user?.userType === 'DEMENTIA_PATIENT' ? 'dementia' : 'standard'
    );
    const [expandedTranscription, setExpandedTranscription] = useState({});

    useEffect(() => {
        loadFiles();
    }, [activeTab]);

    const loadFiles = async () => {
        if (activeTab === 'text') return;

        setLoading(true);
        setError('');

        try {
            let category = activeTab.toUpperCase();
            const response = await fileApi.getFilesByCategory(category);

            console.log('API Response:', response); // Debug log

            if (response.success) {
                setFiles(response.data || []);
                console.log('Loaded files:', response.data); // Debug log
            } else {
                setError('Failed to load files');
            }
        } catch (error) {
            console.error('Failed to load files:', error);
            setError('Failed to load files: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSummarizeFile = async (fileId, fileCategory) => {
        setSummarizing(fileId);
        setError('');
        setSuccess('');

        try {
            let response;

            if (fileCategory === 'PDF') {
                response = await fileApi.summarizePDF(fileId, { mode: summaryMode });
            } else if (fileCategory === 'AUDIO') {
                response = await fileApi.summarizeAudio(fileId, {
                    mode: summaryMode,
                    saveTranscription: true
                });
            } else if (fileCategory === 'VIDEO') {
                response = await fileApi.summarizeVideo(fileId, {
                    mode: summaryMode,
                    saveTranscription: true
                });
            }

            if (response.success) {
                setSuccess('✅ Summary generated successfully!');
                await loadFiles(); // Reload to show summary
            }
        } catch (error) {
            console.error('Summarization error:', error);
            setError(error.response?.data?.message || 'Failed to generate summary');
        } finally {
            setSummarizing(null);
        }
    };

    const handleSummarizeText = async (e) => {
        e.preventDefault();
        if (!textInput.trim()) {
            setError('Please enter some text to summarize');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        setTextSummary('');

        try {
            const response = await fileApi.summarizeText(textInput, summaryMode);
            if (response.success) {
                setTextSummary(response.data);
                setSuccess('✅ Summary generated!');
            }
        } catch (error) {
            setError('Failed to generate summary');
        } finally {
            setLoading(false);
        }
    };

    const toggleTranscription = (fileId) => {
        setExpandedTranscription(prev => ({
            ...prev,
            [fileId]: !prev[fileId]
        }));
    };

    const renderFileCard = (file) => {
        const isProcessing = summarizing === file.id;
        const categoryIcons = {
            'PDF': '📄',
            'AUDIO': '🎵',
            'VIDEO': '🎥'
        };

        return (
            <div key={file.id} className="border rounded-lg p-4 hover:shadow-md transition bg-white">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{categoryIcons[file.category]}</span>
                        <div>
                            <h3 className="font-medium text-gray-900 truncate max-w-xs" title={file.originalFileName}>
                                {file.originalFileName}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {new Date(file.uploadedAt).toLocaleDateString()} • {fileApi.formatFileSize(file.fileSize)}
                            </p>
                        </div>
                    </div>
                    {file.processed && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            ✓ Processed
                        </span>
                    )}
                </div>

                {/* Transcription (for audio/video) */}
                {file.extractedText && (file.category === 'AUDIO' || file.category === 'VIDEO') && (
                    <div className="bg-blue-50 p-3 rounded mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-blue-900">📝 Transcription:</p>
                            <button
                                onClick={() => toggleTranscription(file.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                {expandedTranscription[file.id] ? 'Show less' : 'Show more'}
                            </button>
                        </div>
                        <p className={`text-sm text-blue-800 ${expandedTranscription[file.id] ? '' : 'line-clamp-3'}`}>
                            {file.extractedText}
                        </p>
                    </div>
                )}

                {/* Summary */}
                {file.summary && (
                    <div className="bg-purple-50 p-3 rounded mb-3">
                        <p className="text-xs font-medium text-purple-900 mb-1">🔍 Summary:</p>
                        <p className="text-sm text-purple-800">{file.summary}</p>
                    </div>
                )}

                <button
                    onClick={() => handleSummarizeFile(file.id, file.category)}
                    disabled={isProcessing || file.processed}
                    className={`w-full py-2 px-4 rounded font-medium transition ${file.processed
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                >
                    {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {file.category === 'PDF' ? 'Summarizing...' : 'Transcribing & Summarizing...'}
                        </span>
                    ) : file.processed ? (
                        '✓ Already Processed'
                    ) : (
                        `🤖 ${file.category === 'PDF' ? 'Summarize' : 'Transcribe & Summarize'}`
                    )}
                </button>
            </div>
        );
    };

    const renderEmptyState = (type) => {
        const emptyStates = {
            PDF: { icon: '📄', text: 'No PDF files uploaded yet' },
            AUDIO: { icon: '🎵', text: 'No audio files uploaded yet' },
            VIDEO: { icon: '🎥', text: 'No video files uploaded yet' }
        };

        const state = emptyStates[type];

        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">{state.icon}</div>
                <p className="text-gray-500 mb-4">{state.text}</p>
                <button
                    onClick={() => navigate('/files')}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                    Upload Files
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
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
                            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Summarization</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {user?.userType === 'DEMENTIA_PATIENT' && (
                                <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    ♿ Simplified Mode
                                </span>
                            )}
                            <button
                                onClick={() => navigate('/files')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                📁 View All Files
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
                        {success}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
                    <div className="flex border-b overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('pdf')}
                            className={`flex-1 py-4 px-6 font-medium transition whitespace-nowrap ${activeTab === 'pdf'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            📄 PDF Files
                        </button>
                        <button
                            onClick={() => setActiveTab('audio')}
                            className={`flex-1 py-4 px-6 font-medium transition whitespace-nowrap ${activeTab === 'audio'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            🎵 Audio Files
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex-1 py-4 px-6 font-medium transition whitespace-nowrap ${activeTab === 'video'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            🎥 Video Files
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`flex-1 py-4 px-6 font-medium transition whitespace-nowrap ${activeTab === 'text'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            ✏️ Text Input
                        </button>
                    </div>

                    {/* File Tabs Content */}
                    {(activeTab === 'pdf' || activeTab === 'audio' || activeTab === 'video') && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">
                                Your {activeTab.toUpperCase()} Files
                            </h2>
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading files...</p>
                                </div>
                            ) : files.length === 0 ? (
                                renderEmptyState(activeTab.toUpperCase())
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {files.map(renderFileCard)}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Processing Notice for Audio/Video */}
                    {(activeTab === 'audio' || activeTab === 'video') && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="font-semibold text-yellow-900 mb-2">⏱️ Processing Time:</h3>
                            <p className="text-sm text-yellow-800">
                                Audio and video files may take several minutes to process depending on file length.
                                Please be patient while we transcribe and summarize your content.
                            </p>
                        </div>
                    )}

                    {/* Text Input Tab */}
                    {activeTab === 'text' && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Enter Text to Summarize</h2>
                            <form onSubmit={handleSummarizeText} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Text
                                    </label>
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows="10"
                                        placeholder="Paste or type the text you want to summarize here..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !textInput.trim()}
                                    className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Generating Summary...' : '🤖 Generate Summary'}
                                </button>
                            </form>

                            {textSummary && (
                                <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
                                    <h3 className="text-lg font-bold text-purple-900 mb-3">🔍 Summary:</h3>
                                    <p className="text-gray-800 whitespace-pre-wrap">{textSummary}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Upload PDF, audio, or video files from the Files page</li>
                        <li>• Click "Transcribe & Summarize" for audio/video or "Summarize" for PDFs</li>
                        <li>• Audio and video files are transcribed using AI speech recognition</li>
                        <li>• All summaries and transcriptions are saved automatically</li>
                        {user?.userType === 'DEMENTIA_PATIENT' && (
                            <li className="font-medium">• Summaries are simplified for easier understanding</li>
                        )}
                    </ul>
                </div>

               
            </main>
        </div>
    );
};

export default SummarizationPage;
