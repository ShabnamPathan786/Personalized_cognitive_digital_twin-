package com.digitaltwin.digital_twin_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

/**
 * WebSocket Configuration
 * Sets up STOMP over WebSocket for real-time voice streaming
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-voice")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setHeartbeatTime(25000)
                .setDisconnectDelay(30000)
                .setSessionCookieNeeded(false)
                .setWebSocketEnabled(true)
                .setSuppressCors(true);  // Add this to handle CORS properly
    }
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration
                .setMessageSizeLimit(512 * 1024)        // 512KB for messages
                .setSendBufferSizeLimit(1024 * 1024)     // 1MB for send buffer
                .setSendTimeLimit(20 * 1000)              // 20 seconds
                .setTimeToFirstMessage(30 * 1000);        // 30 seconds for first message
    }
}