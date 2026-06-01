package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.entity.UserViewLog;
import com.example.demo.entity.Scholarship;
import com.example.demo.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final UserViewLogRepository viewLogRepository;
    private final ScholarshipRepository scholarshipRepository;
    private final BookmarkRepository bookmarkRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, UserViewLogRepository viewLogRepository,
                          ScholarshipRepository scholarshipRepository, BookmarkRepository bookmarkRepository,
                          NotificationRepository notificationRepository, PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.viewLogRepository = viewLogRepository;
        this.scholarshipRepository = scholarshipRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));

        Map<String, Object> profile = new HashMap<>();
        profile.put("email", user.getEmail());
        profile.put("name", user.getName());
        profile.put("major", user.getMajor());
        profile.put("keywords", user.getKeywords());
        profile.put("role", user.getRole());
        profile.put("createdAt", user.getCreatedAt());
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));

        if (payload.containsKey("name")) {
            String name = payload.get("name");
            if (name != null && !name.trim().isEmpty()) {
                user.setName(name.trim());
            }
        }
        if (payload.containsKey("major")) {
            String major = payload.get("major");
            user.setMajor(major != null ? major.trim() : "");
        }
        if (payload.containsKey("keywords")) {
            String keywords = payload.get("keywords");
            user.setKeywords(keywords != null ? keywords.trim() : "");
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        String token = payload.get("fcmToken");
        if (token != null && !token.trim().isEmpty()) {
            user.setFcmToken(token.trim());
            userRepository.save(user);
        }
        return ResponseEntity.ok(Map.of("message", "FCM 토큰이 등록되었습니다."));
    }

    @PostMapping("/agree-terms")
    public ResponseEntity<?> agreeTerms(@RequestBody Map<String, Boolean> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "로그인이 필요합니다."));
        }
        Boolean terms = payload.get("terms");
        Boolean privacy = payload.get("privacy");
        if (!Boolean.TRUE.equals(terms) || !Boolean.TRUE.equals(privacy)) {
            return ResponseEntity.badRequest().body(Map.of("message", "서비스 이용약관과 개인정보 처리방침에 모두 동의해야 합니다."));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now();
        user.setTermsAgreedAt(now);
        user.setPrivacyAgreedAt(now);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "약관 동의가 저장되었습니다.", "agreedAt", now));
    }

    @DeleteMapping("/me")
    @Transactional
    public ResponseEntity<?> deleteAccount(
            @RequestBody(required = false) Map<String, String> payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "로그인이 필요합니다."));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));

        // LOCAL 계정은 비밀번호 재확인 필수 (소셜 계정은 토큰 인증만으로 처리)
        boolean isLocalAccount = user.getProvider() == null || "LOCAL".equalsIgnoreCase(user.getProvider());
        if (isLocalAccount) {
            String password = payload != null ? payload.get("password") : null;
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "비밀번호 확인이 필요합니다."));
            }
            if (!passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "비밀번호가 올바르지 않습니다."));
            }
        }

        // 1. 연관 데이터 명시적 삭제 (DB FK가 ON DELETE CASCADE라도 JPA 영속성 컨텍스트 안전성 확보)
        bookmarkRepository.deleteAllByUser(user);
        notificationRepository.deleteAllByUser(user);
        viewLogRepository.deleteAllByUser(user);

        // 2. 현재 액세스 토큰 블랙리스트 등록 (즉시 무효화)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtUtil.blacklistToken(authHeader.substring(7));
        }

        // 3. 사용자 삭제
        userRepository.delete(user);

        return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
    }

    @PostMapping("/view-log")
    public ResponseEntity<?> logView(@RequestBody Map<String, Object> payload, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        Object scholarshipIdObj = payload.get("scholarshipId");
        if (scholarshipIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "scholarshipId는 필수입니다."));
        }

        Long scholarshipId = Long.valueOf(scholarshipIdObj.toString());
        String actionType = payload.getOrDefault("actionType", "VIEW").toString();

        return scholarshipRepository.findById(scholarshipId)
                .map(scholarship -> {
                    viewLogRepository.save(new UserViewLog(user, scholarship, actionType));
                    // 조회수 증가
                    if ("VIEW".equalsIgnoreCase(actionType)) {
                        scholarship.setViewCount(
                                (scholarship.getViewCount() != null ? scholarship.getViewCount() : 0) + 1
                        );
                        scholarshipRepository.save(scholarship);
                    }
                    return ResponseEntity.ok(Map.of("message", "기록 완료"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
