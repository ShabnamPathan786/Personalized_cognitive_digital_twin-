package com.digitaltwin.digital_twin_backend.config;

import com.digitaltwin.digital_twin_backend.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setPasswordEncoder(passwordEncoder());
        authProvider.setUserDetailsService(userDetailsService);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authenticationProvider(authenticationProvider())

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/auth/**", "/actuator/health", "/api/public/**").permitAll()

                        // ✅ FIX 1: Permit WebSocket handshake and SockJS endpoints.
                        // These URLs are hit BEFORE the STOMP CONNECT frame is sent,
                        // so Spring Security sees no authentication yet and rejects them
                        // as anonymous — causing the 1-second connect→disconnect loop.
                        // Authentication is enforced at the STOMP message level by
                        // WebSocketSecurityConfig.messageAuthorizationManager() instead.
                        .requestMatchers("/ws-voice/**").permitAll()
                        .requestMatchers("/ws-voice-direct/**").permitAll()

                        .requestMatchers("/api/dementia/**").hasRole("DEMENTIA_PATIENT")
                        .requestMatchers("/api/caregiver/**").hasRole("CAREGIVER")
                        .requestMatchers("/api/emergency-alerts/**").hasAnyRole("DEMENTIA_PATIENT", "CAREGIVER")
                        .requestMatchers("/api/profile/**").hasAnyRole("DEMENTIA_PATIENT", "CAREGIVER")
                        .anyRequest().authenticated()
                )

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(3)
                        .maxSessionsPreventsLogin(false)
                )

                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(logoutSuccessHandler())
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )

                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \""
                                    + authException.getMessage() + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"Access denied\"}");
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ✅ FIX 2: Use setAllowedOriginPatterns() instead of setAllowedOrigins().
        // setAllowedOrigins() rejects requests with a null Origin header, which
        // SockJS sends during its WebSocket upgrade handshake — causing CORS failure
        // before the request even reaches Spring Security.
        // setAllowedOriginPatterns() handles null-origin SockJS requests correctly
        // while still allowing credentials (setAllowCredentials(true)).
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:*"   // covers any local dev port variations
        ));

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // ✅ FIX 3: Add missing headers that SockJS and STOMP need
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers",
                // SockJS/STOMP specific
                "heart-beat",
                "destination",
                "content-length"
        ));

        configuration.setAllowCredentials(true);

        // ✅ FIX 4: Expose headers the frontend needs to read
        configuration.setExposedHeaders(Arrays.asList(
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public LogoutSuccessHandler logoutSuccessHandler() {
        return (request, response, authentication) -> {
            response.setStatus(200);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\": \"Logout successful\"}");
        };
    }

    @Bean
    public AuthenticationFailureHandler authenticationFailureHandler() {
        return (request, response, exception) -> {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Authentication failed\", \"message\": \""
                    + exception.getMessage() + "\"}");
        };
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return (request, response, authentication) -> {
            response.setStatus(200);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\": \"Login successful\", \"username\": \""
                    + authentication.getName() + "\"}");
        };
    }
}