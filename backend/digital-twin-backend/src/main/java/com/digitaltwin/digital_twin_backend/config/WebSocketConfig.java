package com.digitaltwin.digital_twin_backend.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

/**
 * WebSocket Configuration
 * Sets up STOMP over WebSocket for real-time voice streaming
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
     @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(512 * 1024);
        container.setMaxBinaryMessageBufferSize(512 * 1024);
        return container;
    }
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
                .setSessionCookieNeeded(true)
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
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.taskExecutor()
               .corePoolSize(10)      // Handle 10 concurrent message processing
               .maxPoolSize(50)       // Scale up to 50 if needed
               .queueCapacity(100);   // Queue up to 100 messages before rejecting
}

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
    registration.taskExecutor()
               .corePoolSize(10)
               .maxPoolSize(50);
}
}
