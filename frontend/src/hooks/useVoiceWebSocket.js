import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// Polyfill for global object
if (typeof global === "undefined") {
    window.global = window;
}

/**
 * Custom hook for WebSocket voice streaming
 * @returns {Object} Voice WebSocket methods and state
 */
export const useVoiceWebSocket = () => {
    const [connected, setConnected] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [response, setResponse] = useState(null);
    const [waitingForReview, setWaitingForReview] = useState(false);
    const [reviewId, setReviewId] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [ready, setReady] = useState(false);

    const stompClient = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const sessionId = useRef(
        "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
    const chunkCount = useRef(0);
    const pingInterval = useRef(null);
    const reconnectTimeout = useRef(null);
    const pendingChunks = useRef([]);
    // ✅ FIX: Store mode in a ref instead of localStorage
    // localStorage is not supported in Claude artifacts and creates a stale-read
    // race condition — the mode written by setMode() may not be read correctly
    // by stopRecording() if both happen in the same render cycle.
    const modeRef = useRef("standard");

    useEffect(() => {
        // Only ready when connected AND session established
        setReady(connected && stompClient.current?.connected);
    }, [connected]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            cleanup();
        };
    }, []);
    // Add this useEffect in your hook
    useEffect(() => {
        if (!connected && isRecording) {
            console.log("🔌 Connection lost while recording, cleaning up...");

            // Stop media recorder if active
            if (
                mediaRecorder.current &&
                mediaRecorder.current.state === "recording"
            ) {
                mediaRecorder.current.stop();
                mediaRecorder.current.stream
                    .getTracks()
                    .forEach((track) => track.stop());
            }

            setIsRecording(false);
            audioChunks.current = [];
            chunkCount.current = 0;
            setError("Connection lost. Please try again.");
        }
    }, [connected, isRecording]);

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
            console.log("Connecting to WebSocket...", sessionId.current);

            const socket = new SockJS("http://localhost:8080/ws-voice", null, {
                transports: ["websocket", "xhr-streaming", "xhr-polling"],
                timeout: 30000,
            });

            stompClient.current = new Client({
                webSocketFactory: () => socket,
                debug: (str) => console.log("STOMP:", str),
                // ✅ FIXED: Match server ping interval (25s) + buffer
                heartbeatIncoming: 30000,  // Expect server heartbeat every 30s (was 4s)
                heartbeatOutgoing: 10000,  // Send heartbeat every 10s (was 4s)
                connectionTimeout: 60000,  // Increase to 60s for safety


                onConnect: () => {
                    console.log("✅ Connected to WebSocket");
                    setConnected(true);
                    setError(null);
                    setConnectionAttempts(0);
                    setReady(false);
                    startPingInterval();

                    stompClient.current.subscribe(
                        "/user/queue/voice.transcription",
                        (message) => {
                            try {
                                const data = JSON.parse(message.body);
                                console.log("📝 Transcription received:", data);
                                setTranscription(data.text || data);
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    );

                    stompClient.current.subscribe(
                        "/user/queue/voice.response",
                        (message) => {
                            try {
                                const data = JSON.parse(message.body);
                                console.log("📥 Response received:", data);

                                if (data.status === "REVIEW_REQUIRED") {
                                    setWaitingForReview(true);
                                    setReviewId(data.reviewId);
                                } else if (data.status === "REVIEW_COMPLETED") {
                                    setWaitingForReview(false);
                                    setResponse(data);
                                    if (data.audioUrl) playAudio(data.audioUrl);
                                } else if (data.status === "SUCCESS") {
                                    setResponse(data);
                                    if (data.audioUrl) playAudio(data.audioUrl);
                                }
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    );

                    stompClient.current.subscribe(
                        "/user/queue/voice.error",
                        (message) => {
                            try {
                                const data = JSON.parse(message.body);
                                console.error("❌ Error received:", data);
                                setError(data.message || "Unknown error");
                            } catch (e) {
                                setError("Connection error");
                            }
                        }
                    );

                    stompClient.current.subscribe(
                        "/user/queue/voice.retransmit",
                        (message) => {
                            try {
                                const data = JSON.parse(message.body);
                                console.log(
                                    "Retransmission requested for sequence:",
                                    data.missingSequence
                                );
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    );

                    stompClient.current.subscribe("/user/queue/voice.ack", (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            console.log("✅ Chunk acknowledged:", data.ack);
                        } catch (e) {
                            console.error("Parse error:", e);
                        }
                    });

                    stompClient.current.publish({
                        destination: "/app/voice.connect",
                        headers: { sessionId: sessionId.current },
                        body: JSON.stringify({}),
                    });

                    setTimeout(() => {
                        setReady(true);
                        console.log('🎯 Ready for recording');
                    }, 500);

                    console.log("Connect message sent for session:", sessionId.current);
                },

                onStompError: (frame) => {
                    console.error("STOMP error", frame);
                    setError("Connection error - please refresh");
                    setConnected(false);
                    scheduleReconnect();
                },

                onDisconnect: () => {
                    console.log("Disconnected from WebSocket");
                    setConnected(false);
                    setReady(false);
                    stopPingInterval();
                    scheduleReconnect();
                },

                onWebSocketError: (event) => {
                    console.error("WebSocket error", event);
                    setError("WebSocket connection error");
                    setConnected(false);
                },

                onWebSocketClose: (event) => {
                    console.log("WebSocket closed", event);
                    setConnected(false);
                    stopPingInterval();
                    scheduleReconnect();
                },
            });

            stompClient.current.activate();
        } catch (err) {
            console.error("WebSocket connection error:", err);
            setError("Failed to connect to voice service");
            scheduleReconnect();
        }
    };

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }

        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);

        // Exponential backoff with jitter
        const baseDelay = Math.min(5000 * Math.pow(1.5, attempts - 1), 30000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        console.log(`Scheduling reconnect in ${delay}ms (attempt ${attempts})`);

        reconnectTimeout.current = setTimeout(() => {
            if (!connected) {
                // ✅ CRITICAL: Generate new session ID for fresh session
                sessionId.current =
                    "session_" +
                    Date.now() +
                    "_" +
                    Math.random().toString(36).substr(2, 9);
                console.log("🆕 New session ID for reconnect:", sessionId.current);

                // Reset recording state completely
                setIsRecording(false);
                audioChunks.current = [];
                chunkCount.current = 0;

                // Reset STOMP client completely
                if (stompClient.current) {
                    stompClient.current.deactivate();
                    stompClient.current = null;
                }

                connectWebSocket();
            }
        }, delay);
    }, [connected, connectionAttempts]);

    const startPingInterval = () => {
        stopPingInterval();
        pingInterval.current = setInterval(() => {
            if (stompClient.current && stompClient.current.connected) {
                stompClient.current.publish({
                    destination: "/app/voice.ping",
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify({}),
                });
                console.log("Ping sent to keep connection alive");
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
        if (!stompClient.current || !stompClient.current.connected) {
            console.warn('⚠️ Queuing chunk - not connected');
            pendingChunks.current.push({ base64Data, seqNum, sizeBytes });
            return;
        }

        stompClient.current.publish({
            destination: "/app/voice.stream",
            headers: { sessionId: sessionId.current },
            body: JSON.stringify({
                sessionId: sessionId.current,
                sequenceNumber: seqNum,
                data: base64Data,
                format: "webm",
                sampleRate: 16000,
                chunkSizeBytes: sizeBytes,
                timestamp: Date.now(),
                isLast: false,
            }),
        });
        console.debug(`📤 Sent chunk ${seqNum}`);
    };

    useEffect(() => {
        if (connected && pendingChunks.current.length > 0) {
            console.log(`🔄 Flushing ${pendingChunks.current.length} queued chunks`);
            const chunks = [...pendingChunks.current];
            pendingChunks.current = [];
            chunks.forEach(chunk => sendAudioChunk(chunk.base64Data, chunk.seqNum, chunk.sizeBytes));
        }
    }, [connected]);

    const startRecording = useCallback(async () => {
        if (!stompClient.current || !stompClient.current.connected) {
            setError('Not connected to server. Please wait...');
            console.warn('⚠️ Cannot start recording - STOMP not connected');
            return;
        }
        // ✅ Guard: Check MediaRecorder API availability
        if (!window.MediaRecorder) {
            setError(
                "Audio recording not supported in this browser. Use Chrome, Firefox, or Edge."
            );
            return;
        }
        console.log('🎤 Start recording clicked');
        console.log('🔗 STOMP state:', stompClient.current?.connected ? 'connected' : 'disconnected');
        console.log('📡 Session ID:', sessionId.current);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // ✅ Determine supported MIME type with proper fallback chain
            const mimeTypes = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/mp4", // Safari/iOS
                "audio/mp4;codecs=mp4a.40.2", // AAC
                "", // Let browser decide (last resort)
            ];

            let mimeType =
                mimeTypes.find(
                    (type) => type === "" || MediaRecorder.isTypeSupported(type)
                ) || "audio/webm"; // fallback default

            // ✅ Guard: Validate MediaRecorder can be created
            let recorder;
            try {
                recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            } catch (err) {
                console.warn(
                    "MediaRecorder failed with mimeType, trying default:",
                    err
                );
                recorder = new MediaRecorder(stream); // Browser picks
            }

            mediaRecorder.current = recorder;
            audioChunks.current = [];
            chunkCount.current = 0;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // ✅ Your existing 100KB guard is good, keep it
                    if (event.data.size > 100 * 1024) {
                        console.warn(
                            "⚠️ Chunk too large, skipping:",
                            event.data.size,
                            "bytes"
                        );
                        return;
                    }

                    audioChunks.current.push(event.data);

                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64Data = reader.result.split(",")[1];
                        sendAudioChunk(base64Data, chunkCount.current++, event.data.size);
                    };
                    reader.onerror = (err) => {
                        console.error("FileReader error:", err);
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            // ✅ Add error handler for recorder itself
            recorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                setError("Recording error occurred");
                setIsRecording(false);
            };

            recorder.start(500);
            setIsRecording(true);
            setError(null);

            console.log(
                "Recording started with MIME type:",
                recorder.mimeType || mimeType
            );
        } catch (err) {
            // ✅ Distinguish permission vs other errors
            if (
                err.name === "NotAllowedError" ||
                err.name === "PermissionDeniedError"
            ) {
                setError(
                    "Microphone permission denied. Check browser settings and allow access."
                );
            } else if (err.name === "NotFoundError") {
                setError("No microphone found. Connect a microphone and try again.");
            } else if (err.name === "NotReadableError") {
                setError("Microphone is in use by another application.");
            } else {
                setError(`Recording error: ${err.message}`);
            }
            console.error("Recording error:", err.name, err.message);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());

            if (stompClient.current && stompClient.current.connected) {
                // ✅ FIX: Read mode from ref — always current, no localStorage dependency
                stompClient.current.publish({
                    destination: "/app/voice.stop",
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify({ mode: modeRef.current }),
                });
                console.log("Stop signal sent with mode:", modeRef.current);
            }

            setIsRecording(false);
        }
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
            mediaRecorder.current = null;

            if (stompClient.current && stompClient.current.connected) {
                stompClient.current.publish({
                    destination: "/app/voice.cancel",
                    headers: { sessionId: sessionId.current },
                });
                console.log("Cancel signal sent");
            }

            setIsRecording(false);
            audioChunks.current = [];
        }
    }, []);

    const playAudio = (audioUrl) => {
        const audio = new Audio(audioUrl);
        audio.play().catch((err) => {
            console.error("Audio playback failed:", err);
        });
    };

    const disconnect = useCallback(() => {
        cleanup();
    }, []);

    // ✅ FIX: setMode now writes to ref instead of localStorage
    const setMode = useCallback((mode) => {
        modeRef.current = mode;
        console.log("Voice mode set to:", mode);
    }, []);

    const manualReconnect = useCallback(() => {
        setConnectionAttempts(0);
        cleanup();
        connectWebSocket();
    }, []);

    return {
        ready,
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
        manualReconnect,
    };
};
