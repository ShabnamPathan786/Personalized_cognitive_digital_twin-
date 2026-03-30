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

                // ✅ FIX: Change all .authenticated() to .permitAll()
                .simpSubscribeDestMatchers(
                        "/user/queue/**",
                        "/user/topic/**",
                        "/queue/**",
                        "/topic/**"
                ).permitAll()  // ← was .authenticated()

                // ✅ FIX: Allow all MESSAGE destinations
                .simpDestMatchers(
                        "/app/**",
                        "/user/**"
                ).permitAll()  // ← was .authenticated()

                // ✅ FIX: Allow all user destinations
                .simpMessageDestMatchers(
                        "/user/**",
                        "/queue/**",
                        "/topic/**"
                ).permitAll()  // ← was .authenticated()

                // ✅ FIX: Allow any other message
                .anyMessage().permitAll();  // ← was .authenticated()
    }

    @Override
    protected boolean sameOriginDisabled() {
        return true;
    }
}