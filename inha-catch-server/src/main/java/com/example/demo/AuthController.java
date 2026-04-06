package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        // 입력값 검증
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
        }
        if (!EMAIL_PATTERN.matcher(user.getEmail().trim()).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "올바른 이메일 형식이 아닙니다."));
        }
        if (user.getPassword() == null || user.getPassword().length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "비밀번호는 4자 이상이어야 합니다."));
        }
        if (user.getName() == null || user.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이름을 입력해주세요."));
        }

        if (userRepository.existsByEmail(user.getEmail().trim())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "이미 존재하는 이메일입니다."));
        }

        user.setEmail(user.getEmail().trim());
        user.setName(user.getName().trim());
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(savedUser.getEmail(), savedUser.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(savedUser.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("user", savedUser);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String password = loginData.get("password");

        if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일과 비밀번호를 입력해주세요."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                String accessToken = jwtUtil.generateAccessToken(email.trim(), user.getRole());
                String refreshToken = jwtUtil.generateRefreshToken(email.trim());

                Map<String, Object> response = new HashMap<>();
                response.put("token", accessToken);
                response.put("refreshToken", refreshToken);
                response.put("user", user);

                return ResponseEntity.ok(response);
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> refreshData) {
        String refreshToken = refreshData.get("refreshToken");
        if (refreshToken != null && !refreshToken.trim().isEmpty()
                && !jwtUtil.isBlacklisted(refreshToken)
                && jwtUtil.validateRefreshToken(refreshToken)) {
            String email = jwtUtil.getEmailFromToken(refreshToken);
            Optional<User> userOpt = userRepository.findByEmail(email);
            String role = userOpt.map(User::getRole).orElse("USER");
            String newAccessToken = jwtUtil.generateAccessToken(email, role);
            return ResponseEntity.ok(Map.of("token", newAccessToken));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "리프레시 토큰이 만료되었거나 유효하지 않습니다."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtUtil.blacklistToken(token);
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃 성공"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            // 보안상 이메일 존재 여부를 노출하지 않음
            return ResponseEntity.ok(Map.of("message", "해당 이메일로 임시 비밀번호가 발급되었습니다."));
        }

        // 임시 비밀번호 생성 (8자리 영숫자)
        String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        // TODO: 프로덕션에서는 이메일 발송으로 교체
        Map<String, Object> response = new HashMap<>();
        response.put("message", "임시 비밀번호가 발급되었습니다. 로그인 후 비밀번호를 변경해주세요.");
        response.put("tempPassword", tempPassword);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> payload,
            org.springframework.security.core.Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "로그인이 필요합니다."));
        }

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (currentPassword == null || currentPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "현재 비밀번호를 입력해주세요."));
        }
        if (newPassword == null || newPassword.length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "새 비밀번호는 4자 이상이어야 합니다."));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "현재 비밀번호가 올바르지 않습니다."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
    }
}
