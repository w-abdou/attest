package com.attest.attest.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 5;
    private static final long WINDOW_MS = 60_000;
    private static final List<String> LIMITED_PATHS = List.of("/api/auth/login", "/api/auth/register");

    private final Map<String, RequestWindow> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Preflight OPTIONS requests never carry credentials and shouldn't count
        // against the rate limit — a burst of real requests could otherwise get
        // starved by their own browser-generated preflights.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return LIMITED_PATHS.stream().noneMatch(request.getRequestURI()::equals);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = request.getRemoteAddr();
        long now = System.currentTimeMillis();

        RequestWindow window = requestCounts.computeIfAbsent(clientIp, k -> new RequestWindow(now, 0));

        synchronized (window) {
            if (now - window.windowStart > WINDOW_MS) {
                window.windowStart = now;
                window.count = 0;
            }
            window.count++;

            if (window.count > MAX_REQUESTS) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Too many requests, try again later\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private static class RequestWindow {
        long windowStart;
        int count;
        RequestWindow(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}