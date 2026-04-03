package com.example.demo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JwtUtil {

    private final SecretKey key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private final long JWT_ACCESS_EXPIRATION_MS = 3600000; // 1 hour
    private final long JWT_REFRESH_EXPIRATION_MS = 1209600000; // 14 days
    
    private final Set<String> blacklist = ConcurrentHashMap.newKeySet();

    public String generateAccessToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("type", "access")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JWT_ACCESS_EXPIRATION_MS))
                .signWith(key)
                .compact();
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
            return "access".equals(claims.getBody().get("type", String.class)) || claims.getBody().get("type") == null; 
            // type null fallback for old tokens if necessary
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
        if (token != null && !token.isEmpty()) {
            blacklist.add(token);
        }
    }

    public boolean isBlacklisted(String token) {
        return blacklist.contains(token);
    }
}
