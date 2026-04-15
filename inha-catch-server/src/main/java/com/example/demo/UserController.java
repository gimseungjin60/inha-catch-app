package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.entity.UserViewLog;
import com.example.demo.entity.Scholarship;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final UserViewLogRepository viewLogRepository;
    private final ScholarshipRepository scholarshipRepository;

    public UserController(UserRepository userRepository, UserViewLogRepository viewLogRepository, ScholarshipRepository scholarshipRepository) {
        this.userRepository = userRepository;
        this.viewLogRepository = viewLogRepository;
        this.scholarshipRepository = scholarshipRepository;
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
