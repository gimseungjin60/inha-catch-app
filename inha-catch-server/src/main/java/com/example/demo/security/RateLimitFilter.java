package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 인증 관련 엔드포인트에 in-memory IP 기반 rate limit 적용.
 * - /api/auth/login        : 5회/분
 * - /api/auth/signup       : 3회/분
 * - /api/auth/reset-password : 3회/시간
 *
 * 분산 환경(스케일 아웃) 시에는 Redis 기반(Bucket4j-redis 등)으로 교체 권장.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Map<String, RateLimitPolicy> POLICIES = Map.of(
            "/api/auth/login", new RateLimitPolicy(5, Duration.ofMinutes(1)),
            "/api/auth/signup", new RateLimitPolicy(3, Duration.ofMinutes(1)),
            "/api/auth/reset-password", new RateLimitPolicy(3, Duration.ofHours(1))
    );

    private final Map<String, AccessCounter> counters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        // POST 요청만 제한 (preflight OPTIONS 등은 통과)
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimitPolicy policy = POLICIES.get(path);
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = path + "::" + clientIp;
        AccessCounter counter = counters.computeIfAbsent(key, k -> new AccessCounter());

        if (!counter.tryAcquire(policy)) {
            long retryAfterSec = Math.max(1, policy.windowSeconds() - counter.elapsedSinceOldest());
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfterSec));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"message\":\"요청이 너무 잦아요. " + retryAfterSec + "초 후 다시 시도해주세요.\",\"retryAfter\":" + retryAfterSec + "}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest req) {
        // 프록시/로드밸런서 뒤에서 동작 시 X-Forwarded-For 우선
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = req.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return req.getRemoteAddr();
    }

    // 10분마다 만료된 카운터 정리 — 메모리 누수 방지
    @Scheduled(fixedDelay = 10 * 60 * 1000L)
    public void evictExpiredCounters() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(2));
        counters.entrySet().removeIf(e -> e.getValue().lastAccessedBefore(cutoff));
    }

    // ── inner types ─────────────────────────────────────

    private record RateLimitPolicy(int limit, Duration window) {
        long windowSeconds() {
            return window.getSeconds();
        }
    }

    private static class AccessCounter {
        private final Deque<Instant> timestamps = new ArrayDeque<>();
        private final Object lock = new Object();
        private volatile Instant lastAccess = Instant.now();

        boolean tryAcquire(RateLimitPolicy policy) {
            synchronized (lock) {
                Instant now = Instant.now();
                Instant cutoff = now.minus(policy.window);
                while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(cutoff)) {
                    timestamps.pollFirst();
                }
                lastAccess = now;
                if (timestamps.size() >= policy.limit) {
                    return false;
                }
                timestamps.addLast(now);
                return true;
            }
        }

        long elapsedSinceOldest() {
            synchronized (lock) {
                Instant oldest = timestamps.peekFirst();
                if (oldest == null) return 0;
                return Duration.between(oldest, Instant.now()).getSeconds();
            }
        }

        boolean lastAccessedBefore(Instant cutoff) {
            return lastAccess.isBefore(cutoff);
        }
    }
}
