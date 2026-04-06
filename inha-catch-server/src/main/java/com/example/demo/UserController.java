package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.entity.UserViewLog;
import com.example.demo.entity.Scholarship;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
        if (payload.containsKey("major")) user.setMajor(payload.get("major"));
        if (payload.containsKey("keywords")) user.setKeywords(payload.get("keywords"));

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

        Long scholarshipId = Long.valueOf(payload.get("scholarshipId").toString());
        String actionType = payload.getOrDefault("actionType", "VIEW").toString();

        Scholarship scholarship = scholarshipRepository.findById(scholarshipId).orElseThrow();
        viewLogRepository.save(new UserViewLog(user, scholarship, actionType));

        return ResponseEntity.ok(Map.of("message", "기록 완료"));
    }
}
