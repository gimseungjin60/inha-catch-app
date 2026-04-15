package com.example.demo.security;

import com.example.demo.TokenBlacklistRepository;
import com.example.demo.entity.TokenBlacklist;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long JWT_ACCESS_EXPIRATION_MS = 3600000; // 1시간
    private final long JWT_REFRESH_EXPIRATION_MS = 1209600000; // 14일

    private final TokenBlacklistRepository blacklistRepository;

    public JwtUtil(
            @Value("${jwt.secret}") String jwtSecret,
            TokenBlacklistRepository blacklistRepository
    ) {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.blacklistRepository = blacklistRepository;
    }

    public String generateAccessToken(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("type", "access")
                .claim("role", role != null ? role : "USER")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JWT_ACCESS_EXPIRATION_MS))
                .signWith(key)
                .compact();
    }

    public String generateAccessToken(String email) {
        return generateAccessToken(email, "USER");
    }

    public String generateRefreshToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("type", "refresh")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JWT_REFRESH_EXPIRATION_MS))
                .signWith(key)
                .compact();
    }

    public String getRoleFromToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            String role = claims.get("role", String.class);
            return role != null ? role : "USER";
        } catch (Exception e) {
            return "USER";
        }
    }

    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody().getSubject();
    }

    public boolean validateToken(String token) {
        try {
            if (isBlacklisted(token)) return false;
            Jws<Claims> claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            // access 토큰만 허용 (refresh 토큰이나 type이 없는 토큰 거부)
            return "access".equals(claims.getBody().get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Jws<Claims> claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return "refresh".equals(claims.getBody().get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public void blacklistToken(String token) {
        if (token == null || token.isEmpty()) return;
        if (blacklistRepository.existsByToken(token)) return;

        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            Date expiration = claims.getExpiration();
            LocalDateTime expiresAt = expiration.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
            blacklistRepository.save(new TokenBlacklist(token, expiresAt));
        } catch (JwtException e) {
            // 토큰 파싱 실패 시 1시간 후 만료로 저장
            blacklistRepository.save(new TokenBlacklist(token, LocalDateTime.now().plusHours(1)));
        }
    }

    public boolean isBlacklisted(String token) {
        return blacklistRepository.existsByToken(token);
    }

    // 매일 새벽 3시에 만료된 블랙리스트 토큰 정리
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredTokens() {
        blacklistRepository.deleteExpiredTokens(LocalDateTime.now());
    }
}
