import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Polyfill for global object
if (typeof global === 'undefined') {
    window.global = window;
}

/**
 * Custom hook for WebSocket voice streaming
 * @returns {Object} Voice WebSocket methods and state
 */
export const useVoiceWebSocket = () => {
    const [connected, setConnected] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [response, setResponse] = useState(null);
    const [waitingForReview, setWaitingForReview] = useState(false);
    const [reviewId, setReviewId] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    const stompClient = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const sessionId = useRef('session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    const chunkCount = useRef(0);
    const pingInterval = useRef(null);
    const reconnectTimeout = useRef(null);

    // ✅ FIX: Store mode in a ref instead of localStorage
    // localStorage is not supported in Claude artifacts and creates a stale-read
    // race condition — the mode written by setMode() may not be read correctly
    // by stopRecording() if both happen in the same render cycle.
    const modeRef = useRef('standard');

    useEffect(() => {
        connectWebSocket();
        return () => { cleanup(); };
    }, []);

    const cleanup = () => {
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (stompClient.current && stompClient.current.connected) {
            stopRecording();
            stompClient.current.deactivate();
        }
    };

    const connectWebSocket = () => {
        try {
            console.log('Connecting to WebSocket...', sessionId.current);

            const socket = new SockJS('http://localhost:8080/ws-voice', null, {
                transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
                timeout: 30000
            });

            stompClient.current = new Client({
                webSocketFactory: () => socket,
                debug: (str) => console.log('STOMP:', str),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                connectionTimeout: 30000,

                onConnect: () => {

                    
                    console.log('✅ Connected to WebSocket');
                    setConnected(true);
                    setError(null);
                    setConnectionAttempts(0);

                    startPingInterval();

                    stompClient.current.subscribe('/user/queue/voice.transcription', (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('📝 Transcription received:', data);
                            setTranscription(data.text || data);
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    });

                    stompClient.current.subscribe('/user/queue/voice.response', (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('📥 Response received:', data);

                            if (data.status === 'REVIEW_REQUIRED') {
                                setWaitingForReview(true);
                                setReviewId(data.reviewId);
                            } else if (data.status === 'REVIEW_COMPLETED') {
                                setWaitingForReview(false);
                                setResponse(data);
                                if (data.audioUrl) playAudio(data.audioUrl);
                            } else if (data.status === 'SUCCESS') {
                                setResponse(data);
                                if (data.audioUrl) playAudio(data.audioUrl);
                            }
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    });

                    stompClient.current.subscribe('/user/queue/voice.error', (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.error('❌ Error received:', data);
                            setError(data.message || 'Unknown error');
                        } catch (e) {
                            setError('Connection error');
                        }
                    });

                    stompClient.current.subscribe('/user/queue/voice.retransmit', (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('Retransmission requested for sequence:', data.missingSequence);
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    });

                    stompClient.current.subscribe('/user/queue/voice.ack', (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('✅ Chunk acknowledged:', data.ack);
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    });

                    stompClient.current.publish({
                        destination: '/app/voice.connect',
                        headers: { sessionId: sessionId.current },
                        body: JSON.stringify({})
                    });

                    console.log('Connect message sent for session:', sessionId.current);
                },

                onStompError: (frame) => {
                    console.error('STOMP error', frame);
                    setError('Connection error - please refresh');
                    setConnected(false);
                    scheduleReconnect();
                },

                onDisconnect: () => {
                    console.log('Disconnected from WebSocket');
                    setConnected(false);
                    stopPingInterval();
                    scheduleReconnect();
                },

                onWebSocketError: (event) => {
                    console.error('WebSocket error', event);
                    setError('WebSocket connection error');
                    setConnected(false);
                },

                onWebSocketClose: (event) => {
                    console.log('WebSocket closed', event);
                    setConnected(false);
                    stopPingInterval();
                    scheduleReconnect();
                }
            });

            stompClient.current.activate();

        } catch (err) {
            console.error('WebSocket connection error:', err);
            setError('Failed to connect to voice service');
            scheduleReconnect();
        }
    };

    const scheduleReconnect = () => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }

        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);

        const delay = Math.min(5000 * Math.pow(1.5, attempts - 1), 30000);
        console.log(`Scheduling reconnect in ${delay}ms (attempt ${attempts})`);

        reconnectTimeout.current = setTimeout(() => {
            if (!connected && stompClient.current) {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }
        }, delay);
    };

    const startPingInterval = () => {
        stopPingInterval();
        pingInterval.current = setInterval(() => {
            if (stompClient.current && stompClient.current.connected) {
                stompClient.current.publish({
                    destination: '/app/voice.ping',
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify({})
                });
                console.log('Ping sent to keep connection alive');
            }
        }, 25000);
    };

    const stopPingInterval = () => {
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
    };

    // ✅ Helper: send a single safe-sized audio chunk over STOMP
    const sendAudioChunk = (base64Data, seqNum, sizeBytes) => {
        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: '/app/voice.stream',
                headers: { sessionId: sessionId.current },
                body: JSON.stringify({
                    sessionId: sessionId.current,
                    sequenceNumber: seqNum,
                    data: base64Data,
                    format: 'webm',
                    sampleRate: 16000,
                    chunkSizeBytes: sizeBytes,
                    timestamp: Date.now(),
                    isLast: false
                })
            });
            console.debug(`📤 Sent chunk ${seqNum}, size: ${sizeBytes} chars`);
        }
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            }

            mediaRecorder.current = new MediaRecorder(stream, { mimeType });
            audioChunks.current = [];
            chunkCount.current = 0;

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // ✅ FIX: Guard against oversized chunks
                    // If a chunk exceeds 100KB something is wrong with the encoder —
                    // skip it and warn rather than let Spring close the connection.
                    if (event.data.size > 100 * 1024) {
                        console.warn('⚠️ Chunk too large, skipping:', event.data.size, 'bytes');
                        return;
                    }
                    audioChunks.current.push(event.data);

                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64Data = reader.result.split(',')[1];

                        if (stompClient.current && stompClient.current.connected) {
                            stompClient.current.publish({
                                destination: '/app/voice.stream',
                                headers: { sessionId: sessionId.current },
                                body: JSON.stringify({
                                    sessionId: sessionId.current,
                                    sequenceNumber: chunkCount.current,
                                    data: base64Data,
                                    format: 'webm',
                                    sampleRate: 16000,
                                    chunkSizeBytes: event.data.size,
                                    timestamp: Date.now(),
                                    isLast: false
                                })
                            });
                            chunkCount.current++;
                        }
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            mediaRecorder.current.start(1000);
            setIsRecording(true);
            setError(null);

            console.log('Recording started with MIME type:', mimeType);

        } catch (err) {
            console.error('Recording error:', err);
            setError('Microphone access denied or not available');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());

            if (stompClient.current && stompClient.current.connected) {
                // ✅ FIX: Read mode from ref — always current, no localStorage dependency
                stompClient.current.publish({
                    destination: '/app/voice.stop',
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify({ mode: modeRef.current })
                });
                console.log('Stop signal sent with mode:', modeRef.current);
            }

            setIsRecording(false);
        }
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorder.current = null;

            if (stompClient.current && stompClient.current.connected) {
                stompClient.current.publish({
                    destination: '/app/voice.cancel',
                    headers: { sessionId: sessionId.current }
                });
                console.log('Cancel signal sent');
            }

            setIsRecording(false);
            audioChunks.current = [];
        }
    }, []);

    const playAudio = (audioUrl) => {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => {
            console.error('Audio playback failed:', err);
        });
    };

    const disconnect = useCallback(() => { cleanup(); }, []);

    // ✅ FIX: setMode now writes to ref instead of localStorage
    const setMode = useCallback((mode) => {
        modeRef.current = mode;
        console.log('Voice mode set to:', mode);
    }, []);

    const manualReconnect = useCallback(() => {
        setConnectionAttempts(0);
        cleanup();
        connectWebSocket();
    }, []);

    return {
        connected,
        transcription,
        response,
        waitingForReview,
        reviewId,
        error,
        isRecording,
        sessionId: sessionId.current,
        connectionAttempts,
        startRecording,
        stopRecording,
        cancelRecording,
        disconnect,
        setMode,
        manualReconnect
    };
};