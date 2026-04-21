package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, RateBucket> buckets = new ConcurrentHashMap<>();

    private static final int AUTH_LIMIT = 10;       // 로그인/회원가입: 분당 10회
    private static final int RESET_LIMIT = 3;       // 비밀번호 재설정: 분당 3회
    private static final int DEFAULT_LIMIT = 60;    // 일반 API: 분당 60회
    private static final long WINDOW_MS = 60_000;   // 1분 윈도우

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();
        int limit = resolveLimit(path);

        String bucketKey = clientIp + ":" + resolveBucketCategory(path);
        RateBucket bucket = buckets.compute(bucketKey, (key, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateBucket(now);
            }
            return existing;
        });

        int count = bucket.counter.incrementAndGet();
        if (count > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"요청이 너무 많습니다. 잠시 후 다시 시도해주세요.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int resolveLimit(String path) {
        if (path.startsWith("/api/auth/reset-password")) return RESET_LIMIT;
        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/signup")) return AUTH_LIMIT;
        return DEFAULT_LIMIT;
    }

    private String resolveBucketCategory(String path) {
        if (path.startsWith("/api/auth/reset-password")) return "reset";
        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/signup")) return "auth";
        return "default";
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RateBucket {
        final long windowStart;
        final AtomicInteger counter = new AtomicInteger(0);

        RateBucket(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
