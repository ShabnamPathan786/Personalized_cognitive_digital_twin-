import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Polyfill for global object
if (typeof global === 'undefined') {
    window.global = window;
}

/**
 * Generic WebSocket hook for real-time updates
 * @param {string} topic - WebSocket topic to subscribe to
 * @returns {Object} WebSocket state and last message
 */
export const useWebSocket = (topic) => {
    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const stompClient = useRef(null);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [topic]);

    const connectWebSocket = () => {
        try {
            // Create SockJS connection
            const socket = new SockJS('http://localhost:8080/ws-voice');

            // Create STOMP client
            stompClient.current = new Client({
                webSocketFactory: () => socket,
                debug: (str) => console.log('WS:', str),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                connectionTimeout: 10000,
                onConnect: () => {
                    console.log('✅ WebSocket connected');
                    setConnected(true);

                    stompClient.current.subscribe(topic, (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            setLastMessage(parsedMessage);
                        } catch (e) {
                            setLastMessage(message);
                        }
                    });
                },
                onDisconnect: () => {
                    console.log('❌ WebSocket disconnected');
                    setConnected(false);
                },
                onStompError: (frame) => {
                    console.error('STOMP error', frame);
                    setConnected(false);
                }
            });

            stompClient.current.activate();

        } catch (err) {
            console.error('WebSocket connection error:', err);
        }
    };

    const sendMessage = (destination, body, headers = {}) => {
        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: destination,
                headers: headers,
                body: JSON.stringify(body)
            });
            return true;
        }
        return false;
    };

    return {
        connected,
        lastMessage,
        sendMessage
    };
};