import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth } from "../contexts/AuthContext";

if (typeof global === "undefined") {
    window.global = window;
}

const createSessionId = () =>
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

export const useVoiceWebSocket = () => {
    const { user } = useAuth();
    const [connected, setConnected] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [response, setResponse] = useState(null);
    const [latestResponse, setLatestResponse] = useState(() => {
        try {
            const saved = sessionStorage.getItem("voiceHelper.latestResponse");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [waitingForReview, setWaitingForReview] = useState(false);
    const [reviewId, setReviewId] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [ready, setReady] = useState(false);
    
    const stopInProgress = useRef(false);
    const stompClient = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const sessionId = useRef(createSessionId());
    const chunkCount = useRef(0);
    const pingInterval = useRef(null);
    const reconnectTimeout = useRef(null);
    const pendingChunks = useRef([]);
    const modeRef = useRef("standard");
    const subscriptionsRef = useRef([]);
    const lastHandledMessageRef = useRef(null);
    const isUnmountedRef = useRef(false);

    // ✅ Check if user is anonymous
    const isAnonymous = !user || !user.id;

    useEffect(() => {
        setReady(connected && stompClient.current?.connected);
    }, [connected]);

    useEffect(() => {
        isUnmountedRef.current = false;
        connectWebSocket();
        return () => {
            isUnmountedRef.current = true;
            cleanup();
        };
    }, []);

    useEffect(() => {
        if (!connected && isRecording) {
            console.log("🔌 Connection lost while recording, cleaning up...");
            if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
                mediaRecorder.current.stop();
                mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
            }
            setIsRecording(false);
            setIsProcessing(false);
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
        if (stompClient.current && stompClient.current.connected && mediaRecorder.current?.state === "recording") {
            stopRecording();
        }
        if (stompClient.current) {
            stompClient.current.deactivate();
        }
        subscriptionsRef.current = [];
    };

    const clearStoredResponse = () => {
        try {
            sessionStorage.removeItem("voiceHelper.latestResponse");
        } catch (error) {
            console.warn("Unable to clear stored voice response:", error);
        }
    };

    const persistLatestResponse = (data) => {
        try {
            sessionStorage.setItem("voiceHelper.latestResponse", JSON.stringify(data));
        } catch (error) {
            console.warn("Unable to persist latest voice response:", error);
        }
    };

    const safeSetError = (message) => {
        if (!isUnmountedRef.current) {
            setError(message);
        }
    };

    const resetRecorderState = ({ keepProcessing = false } = {}) => {
        const recorder = mediaRecorder.current;
        if (recorder?.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
        }
        mediaRecorder.current = null;
        audioChunks.current = [];
        chunkCount.current = 0;
        stopInProgress.current = false;
        setIsRecording(false);
        if (!keepProcessing) {
            setIsProcessing(false);
        }
    };

    const resetConversationState = () => {
        setTranscription("");
        setResponse(null);
        setLatestResponse(null);
        setWaitingForReview(false);
        setReviewId(null);
        setError(null);
        setIsProcessing(false);
        lastHandledMessageRef.current = null;
        clearStoredResponse();
    };

    const clearSubscriptions = () => {
        subscriptionsRef.current.forEach((subscription) => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                console.warn("Failed to unsubscribe cleanly:", error);
            }
        });
        subscriptionsRef.current = [];
    };

    const subscribe = (destination, handler) => {
        const subscription = stompClient.current.subscribe(destination, handler);
        subscriptionsRef.current.push(subscription);
        return subscription;
    };

    const rememberLatestResponse = (data) => {
        setResponse(data);
        setLatestResponse(data);
        persistLatestResponse(data);
    };

    const buildMessageKey = (data) => {
        return [
            data.interactionId || "",
            data.status || "",
            data.reviewId || "",
            data.textResponse || "",
            data.transcription || "",
        ].join("|");
    };

    const buildVoiceUserContext = () => {
        if (!user?.id) {
            return {};
        }

        return {
            userId: user.id,
            userType: user.userType,
            username: user.username || user.email || user.fullName || user.id,
            fullName: user.fullName || "",
        };
    };

    const connectWebSocket = () => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            console.log("🔌 Connecting to WebSocket...", sessionId.current);
            console.log("👤 User status:", isAnonymous ? "Anonymous" : "Authenticated", { user });

            const socket = new SockJS("http://localhost:8080/ws-voice", null, {
                transports: ["websocket", "xhr-streaming", "xhr-polling"],
                timeout: 30000,
            });

            stompClient.current = new Client({
                webSocketFactory: () => socket,
                debug: (str) => console.log("STOMP:", str),
                heartbeatIncoming: 30000,
                heartbeatOutgoing: 10000,
                connectionTimeout: 60000,

                onConnect: () => {
                    console.log("✅ Connected - Session ID:", sessionId.current);
                    console.log("✅ isAnonymous:", isAnonymous);
                    console.log("✅ Connected to WebSocket");
                    setConnected(true);
                    setError(null);
                    setConnectionAttempts(0);
                    setReady(false);
                    startPingInterval();

                    const sid = sessionId.current;
                    clearSubscriptions();

                    const handleMessage = (message, label, callback) => {
                        console.log(`${label}:`, message.body);
                        try {
                            const data = JSON.parse(message.body);
                            callback(data);
                        } catch (e) {
                            console.error("Parse error:", e);
                            safeSetError("Received an invalid response from the voice service.");
                        }
                    };

                    console.log("📡 Subscribing to both anonymous topic and authenticated queue destinations");

                    subscribe(`/topic/voice.transcription/${sid}`, (message) => {
                        handleMessage(message, "📝 Transcription received on topic", (data) => {
                            setTranscription(data.text || data.transcription || data);
                        });
                    });

                    subscribe("/user/queue/voice.transcription", (message) => {
                        handleMessage(message, "📝 Transcription received on queue", (data) => {
                            setTranscription(data.text || data.transcription || data);
                        });
                    });

                    subscribe(`/topic/voice.response/${sid}`, (message) => {
                        handleMessage(message, "📥 Response received on topic", (data) => {
                            handleVoiceResponse(data);
                        });
                    });

                    subscribe("/user/queue/voice.response", (message) => {
                        handleMessage(message, "📥 Response received on queue", (data) => {
                            handleVoiceResponse(data);
                        });
                    });

                    subscribe(`/topic/voice.error/${sid}`, (message) => {
                        handleMessage(message, "❌ Error received on topic", (data) => {
                            setError(data.message || data.error || "Processing error");
                        });
                    });

                    subscribe("/user/queue/voice.error", (message) => {
                        handleMessage(message, "❌ Error received on queue", (data) => {
                            setError(data.message || data.error || "Unknown error");
                        });
                    });

                    subscribe(`/topic/voice.ack/${sid}`, (message) => {
                        handleMessage(message, "✅ Chunk acknowledged on topic", (data) => {
                            console.log("✅ Chunk acknowledged:", data.ack);
                        });
                    });

                    subscribe("/user/queue/voice.ack", (message) => {
                        handleMessage(message, "✅ Chunk acknowledged on queue", (data) => {
                            console.log("✅ Chunk acknowledged:", data.ack);
                        });
                    });

                    // Send connect message
                    stompClient.current.publish({
                        destination: "/app/voice.connect",
                        headers: { sessionId: sessionId.current },
                        body: JSON.stringify(buildVoiceUserContext()),
                    });

                    setTimeout(() => {
                        setReady(true);
                        console.log("🎯 Ready for recording");
                    }, 500);

                    console.log("📤 Connect message sent for session:", sessionId.current);
                },

                onStompError: (frame) => {
                    console.error("❌ STOMP error", frame);
                    safeSetError("The voice connection hit a server error. Reconnecting...");
                    setConnected(false);
                    scheduleReconnect();
                },

                onDisconnect: () => {
                    console.log("🔌 Disconnected from WebSocket");
                    setConnected(false);
                    setReady(false);
                    stopPingInterval();
                    scheduleReconnect();
                },

                onWebSocketError: (event) => {
                    console.error("❌ WebSocket error", event);
                    safeSetError("Voice connection failed. Trying to reconnect...");
                    setConnected(false);
                },

                onWebSocketClose: (event) => {
                    console.log("🔌 WebSocket closed", event);
                    setConnected(false);
                    stopPingInterval();
                    scheduleReconnect();
                },
            });

            stompClient.current.activate();
        } catch (err) {
            console.error("❌ WebSocket connection error:", err);
            safeSetError("Failed to connect to the voice service.");
            scheduleReconnect();
        }
    };

    const handleVoiceResponse = (data) => {
        console.log("🔍 Handling voice response:", data);
        if (!data || typeof data !== "object") {
            setIsProcessing(false);
            safeSetError("Received an unexpected response from the voice service.");
            return;
        }

        const normalizedData = {
            ...data,
            textResponse:
                data.textResponse ||
                data.userFriendlyError ||
                data.errorMessage ||
                "",
        };
        const messageKey = buildMessageKey(normalizedData);
        if (messageKey && messageKey === lastHandledMessageRef.current) {
            console.log("↩️ Duplicate voice response ignored");
            return;
        }
        lastHandledMessageRef.current = messageKey;

        if (normalizedData.transcription) {
            setTranscription(normalizedData.transcription);
        }

        if (!normalizedData.status) {
            setIsProcessing(false);
            safeSetError("Voice service responded without a status.");
            return;
        }

        if (normalizedData.status === "REVIEW_REQUIRED") {
            console.log("⏳ Review required, reviewId:", normalizedData.reviewId);
            setIsProcessing(false);
            setWaitingForReview(true);
            setReviewId(normalizedData.reviewId || null);
            setResponse(null);
        } else if (normalizedData.status === "REVIEW_COMPLETED") {
            console.log("✅ Review completed");
            setIsProcessing(false);
            setWaitingForReview(false);
            setReviewId(null);
            rememberLatestResponse(normalizedData);
            if (normalizedData.audioUrl) playAudio(normalizedData.audioUrl);
        } else if (normalizedData.status === "SUCCESS") {
            console.log("✅ Success response");
            setIsProcessing(false);
            setWaitingForReview(false);
            setReviewId(null);
            rememberLatestResponse(normalizedData);
            if (normalizedData.audioUrl) playAudio(normalizedData.audioUrl);
        } else if (normalizedData.status === "TIMEOUT") {
            console.log("⌛ Timeout response");
            setIsProcessing(false);
            setWaitingForReview(false);
            setReviewId(null);
            rememberLatestResponse(normalizedData);
            if (normalizedData.audioUrl) playAudio(normalizedData.audioUrl);
        } else if (normalizedData.status === "ERROR") {
            console.log("❌ Error response:", normalizedData.textResponse);
            setIsProcessing(false);
            setWaitingForReview(false);
            setReviewId(null);
            setResponse(normalizedData.textResponse ? normalizedData : null);
            if (normalizedData.textResponse) {
                setLatestResponse(normalizedData);
                persistLatestResponse(normalizedData);
            }
            safeSetError(normalizedData.textResponse || "The voice request failed.");
        } else {
            safeSetError(`Unsupported voice response status: ${normalizedData.status}`);
        }
    };

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }

        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);

        const baseDelay = Math.min(5000 * Math.pow(1.5, attempts - 1), 30000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        console.log(`⏳ Scheduling reconnect in ${delay}ms (attempt ${attempts})`);

        reconnectTimeout.current = setTimeout(() => {
            if (!connected) {
                console.log("🔄 Reconnecting with same session ID:", sessionId.current);

                setIsRecording(false);
                setIsProcessing(false);
                audioChunks.current = [];
                chunkCount.current = 0;

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
                console.log("💓 Ping sent with session:", sessionId.current);
            }
        }, 25000);
    };

    const stopPingInterval = () => {
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
    };

    const sendAudioChunk = (base64Data, seqNum, sizeBytes) => {
        if (!stompClient.current || !stompClient.current.connected) {
            console.warn("⚠️ Queuing chunk - not connected");
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
            chunks.forEach((chunk) => sendAudioChunk(chunk.base64Data, chunk.seqNum, chunk.sizeBytes));
        }
    }, [connected]);

    const startRecording = useCallback(async () => {
        if (!stompClient.current || !stompClient.current.connected) {
            safeSetError("Voice helper is not connected yet. Please wait a moment and try again.");
            return;
        }
        if (typeof window === "undefined" || !window.MediaRecorder) {
            safeSetError("Audio recording is not supported in this browser.");
            return;
        }
        if (!navigator?.mediaDevices?.getUserMedia) {
            safeSetError("Microphone access is not available in this browser.");
            return;
        }
        if (isRecording) {
            return;
        }

        try {
            setError(null);
            setResponse(null);
            setLatestResponse(null);
            setTranscription("");
            setWaitingForReview(false);
            setReviewId(null);
            setIsProcessing(false);
            lastHandledMessageRef.current = null;
            clearStoredResponse();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            const mimeType = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/mp4",
                "",
            ].find((t) => t === "" || MediaRecorder.isTypeSupported(t)) || "";

            let recorder;
            try {
                recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            } catch {
                recorder = new MediaRecorder(stream);
            }

            mediaRecorder.current = recorder;
            audioChunks.current = [];
            chunkCount.current = 0;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.current.push(event.data);
                    console.log(`🎙️ Chunk collected: ${event.data.size} bytes`);
                }
            };

            recorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                safeSetError("Recording failed. Please try again.");
                resetRecorderState();
            };

            recorder.start(250);
            setIsRecording(true);
            setError(null);
            console.log("🎤 Recording started. MIME:", recorder.mimeType || mimeType);
        } catch (err) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                safeSetError("Microphone permission was denied. Allow access in browser settings and try again.");
            } else if (err.name === "NotFoundError") {
                safeSetError("No microphone was found on this device.");
            } else if (err.name === "NotReadableError") {
                safeSetError("Your microphone is busy in another app.");
            } else {
                safeSetError(err?.message ? `Recording error: ${err.message}` : "Could not start recording.");
            }
            console.error("Recording error:", err.name, err.message);
            resetRecorderState();
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        const recorder = mediaRecorder.current;
        if (!recorder || recorder.state !== "recording") {
            return;
        }
        if (stopInProgress.current) {
            console.log("🛑 Already stopping, ignoring duplicate call");
            return;
        }
        stopInProgress.current = true;
        setIsProcessing(true);
        setIsRecording(false);
        recorder.onstop = async () => {
            const mimeType = recorder.mimeType || "audio/webm";
            console.log(`📦 Total chunks: ${audioChunks.current.length}, MIME: ${mimeType}`);

            if (audioChunks.current.length === 0) {
                safeSetError("No audio was captured. Please try again.");
                resetRecorderState();
                return;
            }

            const completeBlob = new Blob(audioChunks.current, { type: mimeType });
            console.log(`📦 Complete audio blob: ${completeBlob.size} bytes, type: ${mimeType}`);

            if (completeBlob.size < 1000) {
                safeSetError("Recording was too short. Please speak a little longer.");
                resetRecorderState();
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const encodedAudio = typeof reader.result === "string" ? reader.result : "";
                const base64Data = encodedAudio.includes(",") ? encodedAudio.split(",")[1] : "";
                if (!base64Data) {
                    safeSetError("Could not prepare the recorded audio.");
                    resetRecorderState();
                    return;
                }

                if (!stompClient.current?.connected) {
                    safeSetError("Connection was lost before the audio could be sent.");
                    resetRecorderState();
                    return;
                }

                stompClient.current.publish({
                    destination: "/app/voice.stream",
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify({
                        sessionId: sessionId.current,
                        sequenceNumber: 0,
                        data: base64Data,
                        format: mimeType.includes("mp4") ? "mp4" : "webm",
                        mimeType: mimeType,
                        sampleRate: 16000,
                        chunkSizeBytes: completeBlob.size,
                        timestamp: Date.now(),
                        isLast: true,
                    }),
                });

                console.log("📤 Complete audio sent, size:", completeBlob.size);

                setTimeout(() => {
                    if (stompClient.current?.connected) {
                        stompClient.current.publish({
                            destination: "/app/voice.stop",
                            headers: { sessionId: sessionId.current },
                            body: JSON.stringify({
                                mode: modeRef.current,
                                ...buildVoiceUserContext(),
                            }),
                        });
                        console.log("🛑 Stop signal sent, mode:", modeRef.current);
                    }
                }, 300);
            };

            reader.onerror = (err) => {
                console.error("FileReader error:", err);
                safeSetError("Failed to process the recorded audio.");
                resetRecorderState();
            };

            reader.readAsDataURL(completeBlob);
            resetRecorderState({ keepProcessing: true });
        };

        recorder.stop();
        if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
        }
    }, []);

    const cancelRecording = useCallback(() => {
        if (stopInProgress.current) {
            console.log("🛑 Stop in progress, skip cancel");
            return;
        }
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
            mediaRecorder.current = null;

            if (stompClient.current && stompClient.current.connected) {
                stompClient.current.publish({
                    destination: "/app/voice.cancel",
                    headers: { sessionId: sessionId.current },
                    body: JSON.stringify(buildVoiceUserContext()),
                });
                console.log("Cancel signal sent");
            }

            setIsRecording(false);
            setIsProcessing(false);
            audioChunks.current = [];
            stopInProgress.current = false;
        }
    }, []);

    const playAudio = (audioUrl) => {
        if (!audioUrl) {
            return;
        }
        const audio = new Audio(audioUrl);
        audio.play().catch((err) => {
            console.error("Audio playback failed:", err);
            safeSetError("The reply arrived, but audio playback could not start.");
        });
    };

    const disconnect = useCallback(() => {
        cleanup();
    }, []);

    const setMode = useCallback((mode) => {
        modeRef.current = mode;
        console.log("Voice mode set to:", mode);
    }, []);

    const manualReconnect = useCallback(() => {
        setConnectionAttempts(0);
        setError(null);
        setReady(false);
        setIsProcessing(false);
        cleanup();
        connectWebSocket();
    }, []);

    const restartConversation = useCallback(() => {
        const previousSessionId = sessionId.current;

        if (stompClient.current?.connected) {
            stompClient.current.publish({
                destination: "/app/voice.cancel",
                headers: { sessionId: previousSessionId },
                body: JSON.stringify({}),
            });
        }

        resetRecorderState();
        resetConversationState();
        sessionId.current = createSessionId();
        setReady(false);
        cleanup();
        connectWebSocket();
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        ready,
        connected,
        transcription,
        response,
        latestResponse,
        waitingForReview,
        reviewId,
        error,
        isRecording,
        isProcessing,
        sessionId: sessionId.current,
        connectionAttempts,
        startRecording,
        stopRecording,
        cancelRecording,
        disconnect,
        setMode,
        manualReconnect,
        clearError,
        restartConversation,
    };
};
