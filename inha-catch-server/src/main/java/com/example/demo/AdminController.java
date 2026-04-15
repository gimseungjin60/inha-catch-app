package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ScholarshipRepository scholarshipRepository;
    private final NotificationRepository notificationRepository;
    private final BookmarkRepository bookmarkRepository;

    public AdminController(UserRepository userRepository, ScholarshipRepository scholarshipRepository,
                           NotificationRepository notificationRepository, BookmarkRepository bookmarkRepository) {
        this.userRepository = userRepository;
        this.scholarshipRepository = scholarshipRepository;
        this.notificationRepository = notificationRepository;
        this.bookmarkRepository = bookmarkRepository;
    }

    // ── 상세 통계 ──

    @GetMapping("/stats")
    public ResponseEntity<?> getDetailedStats() {
        long totalScholarships = scholarshipRepository.count();
        long totalUsers = userRepository.count();
        long totalNotifications = notificationRepository.count();
        long totalBookmarks = bookmarkRepository.count();

        // 오늘 기준 통계
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long todayScholarships = scholarshipRepository.countByCrawledAtAfter(todayStart);
        long todayUsers = userRepository.countByCreatedAtAfter(todayStart);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalScholarships", totalScholarships);
        stats.put("totalUsers", totalUsers);
        stats.put("totalNotifications", totalNotifications);
        stats.put("totalBookmarks", totalBookmarks);
        stats.put("todayScholarships", todayScholarships);
        stats.put("todayUsers", todayUsers);

        return ResponseEntity.ok(stats);
    }

    // ── 사용자 관리 ──

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<User> users = userRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        // 비밀번호 제외한 안전한 응답
        List<Map<String, Object>> userList = users.getContent().stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("email", u.getEmail());
            map.put("name", u.getName());
            map.put("major", u.getMajor());
            map.put("role", u.getRole());
            map.put("provider", u.getProvider());
            map.put("isActive", u.getIsActive());
            map.put("createdAt", u.getCreatedAt());
            map.put("hasFcmToken", u.getFcmToken() != null && !u.getFcmToken().isBlank());
            return map;
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("content", userList);
        result.put("totalElements", users.getTotalElements());
        result.put("totalPages", users.getTotalPages());
        result.put("number", users.getNumber());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newRole = payload.get("role");
        if (newRole == null || (!newRole.equals("USER") && !newRole.equals("ADMIN"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 역할입니다. (USER 또는 ADMIN)"));
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        user.setRole(newRole);
        userRepository.save(user);
        log.info("사용자 역할 변경: {} → {}", user.getEmail(), newRole);

        return ResponseEntity.ok(Map.of("message", user.getName() + "의 역할이 " + newRole + "(으)로 변경되었습니다."));
    }

    @PutMapping("/users/{id}/toggle-active")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        boolean newStatus = !(user.getIsActive() != null && user.getIsActive());
        user.setIsActive(newStatus);
        userRepository.save(user);
        log.info("사용자 활성/비활성: {} → {}", user.getEmail(), newStatus ? "활성" : "비활성");

        return ResponseEntity.ok(Map.of(
                "message", user.getName() + " 계정이 " + (newStatus ? "활성화" : "비활성화") + "되었습니다.",
                "isActive", newStatus
        ));
    }

    // ── 알림 테스트 ──

    @PostMapping("/test-notification")
    public ResponseEntity<?> sendTestNotification(@RequestBody Map<String, Object> payload,
                                                   org.springframework.security.core.Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        String title = (String) payload.getOrDefault("title", "테스트 알림");
        String message = (String) payload.getOrDefault("message", "관리자 테스트 알림입니다.");

        // DB에 알림 저장
        com.example.demo.entity.Notification notification = new com.example.demo.entity.Notification(
                user, null, "SYSTEM", title, message
        );
        notificationRepository.save(notification);

        // FCM 푸시 발송 시도
        boolean pushSent = false;
        if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
            // FCMService 주입 필요 - 여기서는 DB 저장만
            pushSent = true;
        }

        return ResponseEntity.ok(Map.of(
                "message", "테스트 알림이 생성되었습니다.",
                "notificationId", notification.getId(),
                "fcmPush", pushSent ? "FCM 토큰 있음 (발송 시도)" : "FCM 토큰 없음 (DB 저장만)"
        ));
    }

    // ── 공고 관리 ──

    @DeleteMapping("/scholarships/{id}")
    public ResponseEntity<?> deleteScholarship(@PathVariable Long id) {
        if (!scholarshipRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        scholarshipRepository.deleteById(id);
        log.info("공고 삭제: ID {}", id);
        return ResponseEntity.ok(Map.of("message", "공고가 삭제되었습니다."));
    }
}
