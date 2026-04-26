import { useState, useEffect } from 'react';
import { fileApi } from '../api/fileApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const FilesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [summarizing, setSummarizing] = useState(null);

    useEffect(() => {
        loadFiles();
    }, [filter]);

    const loadFiles = async () => {
        setLoading(true);
        setError('');
        try {
            let response;
            if (filter === 'ALL') {
                response = await fileApi.getAllFiles();
            } else {
                response = await fileApi.getFilesByCategory(filter);
            }

            if (response.success) {
                setFiles(response.data || []);
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

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (100MB max)
            if (!fileApi.validateFileSize(file, 100)) {
                setError('File size must be less than 100MB');
                return;
            }
            setSelectedFile(file);
            setError('');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('Please select a file');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fileApi.uploadFile(selectedFile, description);
            if (response.success) {
                setSuccess('✅ File uploaded successfully!');
                setSelectedFile(null);
                setDescription('');
                loadFiles(); // Reload the file list

                // Clear the file input
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }

        try {
            await fileApi.deleteFile(fileId);
            setSuccess('File deleted successfully');
            loadFiles();
        } catch (error) {
            setError('Failed to delete file');
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            await fileApi.downloadFile(fileId, fileName);
        } catch (error) {
            setError('Failed to download file');
        }
    };

    const handleSummarize = async (file) => {
        setSummarizing(file.id);
        setError('');
        setSuccess('');

        try {
            let response;
            const mode = user?.userType === 'DEMENTIA_PATIENT' ? 'dementia' : 'standard';

            if (file.category === 'PDF') {
                response = await fileApi.summarizePDF(file.id, { mode });
            } else if (file.category === 'AUDIO') {
                response = await fileApi.summarizeAudio(file.id, { mode, saveTranscription: true });
            } else if (file.category === 'VIDEO') {
                response = await fileApi.summarizeVideo(file.id, { mode, saveTranscription: true });
            }

            if (response.success) {
                setSuccess(`✅ ${file.category} summarized successfully!`);
                loadFiles(); // Reload to show processed status
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to summarize file');
        } finally {
            setSummarizing(null);
        }
    };

    const canSummarize = (file) => {
        return file.category === 'PDF' || file.category === 'AUDIO' || file.category === 'VIDEO';
    };

    const filteredFiles = files;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                            <h1 className="text-2xl font-bold text-gray-900">📁 My Files</h1>
                        </div>
                        <button
                            onClick={() => navigate('/summarization')}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                        >
                            🤖 View Summarization
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
                        {success}
                    </div>
                )}

                {/* Upload Form */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Upload New File</h2>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select File
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                onChange={handleFileSelect}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.mp4,.avi,.mov"
                            />
                            {selectedFile && (
                                <p className="mt-2 text-sm text-gray-600">
                                    Selected: {selectedFile.name} ({fileApi.formatFileSize(selectedFile.size)})
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter file description..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedFile || uploading}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                            {uploading ? 'Uploading...' : '📤 Upload File'}
                        </button>
                    </form>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
                    <div className="flex overflow-x-auto">
                        {['ALL', 'PDF', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'OTHER'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`flex-1 py-3 px-4 font-medium transition whitespace-nowrap ${filter === cat
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Files Grid */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Your Files {filter !== 'ALL' && `(${filter})`}
                    </h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading files...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500">No files found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFiles.map((file) => (
                                <div key={file.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{fileApi.getCategoryIcon(file.category)}</span>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 truncate" title={file.originalFileName}>
                                                    {file.originalFileName}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {fileApi.formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {file.description && (
                                        <p className="text-sm text-gray-600 mb-3">{file.description}</p>
                                    )}

                                    {file.processed && (
                                        <div className="mb-3 p-2 bg-green-50 rounded text-xs text-green-800">
                                            ✓ Processed & Summarized
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownload(file.id, file.originalFileName)}
                                            className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200"
                                        >
                                            📥 Download
                                        </button>

                                        {canSummarize(file) && !file.processed && (
                                            <button
                                                onClick={() => handleSummarize(file)}
                                                disabled={summarizing === file.id}
                                                className="flex-1 bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
                                            >
                                                {summarizing === file.id ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    '🤖 Summarize'
                                                )}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(file.id, file.originalFileName)}
                                            className="bg-red-100 text-red-700 py-2 px-3 rounded text-sm hover:bg-red-200"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Supported Files:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Documents:</strong> PDF, DOC, DOCX</li>
                        <li>• <strong>Images:</strong> JPG, PNG, GIF, WEBP</li>
                        <li>• <strong>Audio:</strong> MP3, WAV, M4A, OGG, FLAC (can be summarized)</li>
                        <li>• <strong>Video:</strong> MP4, AVI, MOV, WMV, WEBM (can be summarized)</li>
                        <li>• <strong>Max file size:</strong> 100MB</li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default FilesPage;
