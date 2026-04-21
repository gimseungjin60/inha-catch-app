package com.example.demo;

import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getMyNotifications(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);

        List<Map<String, Object>> result = notifications.stream().map(n -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", n.getId());
            map.put("type", n.getType());
            map.put("title", n.getTitle());
            map.put("message", n.getMessage());
            map.put("read", n.isRead());
            map.put("createdAt", n.getCreatedAt());
            if (n.getScholarship() != null) {
                map.put("scholarshipId", n.getScholarship().getId());
            }
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        long count = notificationRepository.countByUserAndReadFalse(user);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Notification notification = notificationRepository.findById(id).orElseThrow();

        // 알림 소유자 검증
        if (!notification.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "해당 알림에 대한 권한이 없습니다."));
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "읽음 처리 완료"));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Notification> unread = notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("message", "전체 읽음 처리 완료", "count", unread.size()));
    }
}
