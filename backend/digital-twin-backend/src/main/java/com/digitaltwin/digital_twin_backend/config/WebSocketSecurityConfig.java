package com.digitaltwin.digital_twin_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry;
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer;

@Configuration
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
                // Allow all connection-related messages
                .simpTypeMatchers(
                        SimpMessageType.CONNECT,
                        SimpMessageType.CONNECT_ACK,
                        SimpMessageType.DISCONNECT,
                        SimpMessageType.DISCONNECT_ACK,
                        SimpMessageType.HEARTBEAT,
                        SimpMessageType.UNSUBSCRIBE
                ).permitAll()

                // Allow SUBSCRIBE to user-specific queues (this is the key fix!)
                .simpSubscribeDestMatchers(
                        "/user/queue/**",
                        "/user/topic/**",
                        "/queue/**",
                        "/topic/**"
                ).authenticated()

                // Allow MESSAGE destinations
                .simpDestMatchers(
                        "/app/**",
                        "/user/**"
                ).authenticated()

                // Allow all user destinations
                .simpMessageDestMatchers(
                        "/user/**",
                        "/queue/**",
                        "/topic/**"
                ).authenticated()

                // Default deny
                .anyMessage().authenticated();
    }

    // Disable CSRF for WebSocket
    @Override
    protected boolean sameOriginDisabled() {
        return true;
    }
}