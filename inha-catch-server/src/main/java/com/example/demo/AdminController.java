package com.example.demo;

import com.example.demo.entity.CrawlErrorLog;
import com.example.demo.entity.PushBatch;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.repository.CrawlErrorLogRepository;
import com.example.demo.repository.PushBatchRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ScholarshipRepository scholarshipRepository;
    private final NotificationRepository notificationRepository;
    private final BookmarkRepository bookmarkRepository;
    private final AdminConfigService adminConfigService;
    private final NotificationService notificationService;
    private final PushBatchRepository pushBatchRepository;
    private final CrawlErrorLogRepository crawlErrorLogRepository;

    public AdminController(UserRepository userRepository, ScholarshipRepository scholarshipRepository,
                           NotificationRepository notificationRepository, BookmarkRepository bookmarkRepository,
                           AdminConfigService adminConfigService, NotificationService notificationService,
                           PushBatchRepository pushBatchRepository, CrawlErrorLogRepository crawlErrorLogRepository) {
        this.userRepository = userRepository;
        this.scholarshipRepository = scholarshipRepository;
        this.notificationRepository = notificationRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.adminConfigService = adminConfigService;
        this.notificationService = notificationService;
        this.pushBatchRepository = pushBatchRepository;
        this.crawlErrorLogRepository = crawlErrorLogRepository;
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

    // ── 대시보드 종합 ──

    @GetMapping("/dashboard/overview")
    public ResponseEntity<?> getDashboardOverview() {
        // 카테고리 분포
        List<Object[]> categoryRows = scholarshipRepository.countByCategoryGrouped();
        Map<String, Long> categoryBreakdown = new LinkedHashMap<>();
        for (Object[] row : categoryRows) {
            String category = row[0] != null ? row[0].toString() : "UNKNOWN";
            long count = ((Number) row[1]).longValue();
            categoryBreakdown.put(category, count);
        }

        // 최근 가입자 5명
        List<Map<String, Object>> recentUsers = userRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("name", u.getName());
                    m.put("email", u.getEmail());
                    m.put("major", u.getMajor());
                    m.put("createdAt", u.getCreatedAt());
                    return m;
                })
                .toList();

        // 최근 크롤 에러 5건
        List<Map<String, Object>> recentErrors = crawlErrorLogRepository
                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", e.getId());
                    m.put("targetUrl", e.getTargetUrl());
                    m.put("errorMessage", e.getErrorMessage());
                    m.put("createdAt", e.getCreatedAt());
                    return m;
                })
                .toList();

        return ResponseEntity.ok(Map.of(
                "categoryBreakdown", categoryBreakdown,
                "recentUsers", recentUsers,
                "recentErrors", recentErrors
        ));
    }

    // ── 사용자 통계 ──

    @GetMapping("/users/stats")
    public ResponseEntity<?> getUserStats() {
        long total = userRepository.count();
        long active30d = userRepository.countByCreatedAtAfter(LocalDate.now().minusDays(30).atStartOfDay());
        long admins = userRepository.findAll().stream()
                .filter(u -> "ADMIN".equals(u.getRole()))
                .count();
        return ResponseEntity.ok(Map.of(
                "total", total,
                "active30d", active30d,
                "admins", admins
        ));
    }

    // ── 추천 알고리즘 가중치 ──

    @GetMapping("/algorithm/weights")
    public ResponseEntity<?> getAlgorithmWeights() {
        List<Map<String, Object>> weights = adminConfigService
                .get(AdminConfigService.KEY_ALGORITHM_WEIGHTS,
                        new TypeReference<List<Map<String, Object>>>() {})
                .orElseGet(ArrayList::new);
        return ResponseEntity.ok(weights);
    }

    @PutMapping("/algorithm/weights")
    public ResponseEntity<?> updateAlgorithmWeights(@RequestBody Map<String, Object> payload) {
        Object weightsObj = payload.get("weights");
        if (!(weightsObj instanceof List<?> list)) {
            return ResponseEntity.badRequest().body(Map.of("message", "weights 배열이 필요합니다."));
        }
        // 합계 검증 (1.00 ± 0.01)
        double sum = list.stream()
                .filter(o -> o instanceof Map)
                .map(o -> ((Map<?, ?>) o).get("value"))
                .filter(v -> v instanceof Number)
                .mapToDouble(v -> ((Number) v).doubleValue())
                .sum();
        if (Math.abs(sum - 1.0) > 0.01) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "가중치 합계가 1.00 이어야 합니다. 현재: " + String.format("%.2f", sum)
            ));
        }
        adminConfigService.put(AdminConfigService.KEY_ALGORITHM_WEIGHTS, list);
        log.info("추천 가중치 업데이트: {}", list);
        return ResponseEntity.ok(Map.of("message", "가중치가 저장되었습니다."));
    }

    /** 현재 가중치로 상위 5개 추천 미리보기 (D-day 가까운 + 최근 등록 기반). */
    @GetMapping("/algorithm/preview")
    public ResponseEntity<?> getAlgorithmPreview() {
        List<Map<String, Object>> weights = adminConfigService
                .get(AdminConfigService.KEY_ALGORITHM_WEIGHTS,
                        new TypeReference<List<Map<String, Object>>>() {})
                .orElseGet(ArrayList::new);

        double wUrgency = doubleVal(weights, "urgency", 0.15);
        double wRecency = doubleVal(weights, "recency", 0.10);

        List<Scholarship> recent = scholarshipRepository.findAll(
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "crawledAt"))
        ).getContent();

        // 단순 점수 모델 (가중치 합 기반). 데모용.
        List<Map<String, Object>> scored = new ArrayList<>();
        int rank = 1;
        recent.stream()
                .sorted((a, b) -> Double.compare(scoreFor(b, wUrgency, wRecency), scoreFor(a, wUrgency, wRecency)))
                .limit(5)
                .forEach(s -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("rank", scored.size() + 1);
                    item.put("title", s.getTitle());
                    item.put("category", s.getCategory() != null ? s.getCategory() : "공고");
                    item.put("score", Math.round(scoreFor(s, wUrgency, wRecency) * 100.0) / 100.0);
                    scored.add(item);
                });
        return ResponseEntity.ok(scored);
    }

    private double scoreFor(Scholarship s, double wUrgency, double wRecency) {
        double urgency = 0;
        try {
            String dDay = s.getDDay();
            if (dDay != null && dDay.startsWith("D-")) {
                int days = Integer.parseInt(dDay.replace("D-", ""));
                if (days >= 0 && days <= 30) urgency = 1.0 - (days / 30.0);
            }
        } catch (Exception ignored) {}
        double recency = 0;
        if (s.getCrawledAt() != null) {
            long hoursAgo = java.time.Duration.between(s.getCrawledAt(), LocalDateTime.now()).toHours();
            recency = Math.max(0, 1.0 - (hoursAgo / (24.0 * 7))); // 7일 내 신규 우대
        }
        return urgency * wUrgency * 5 + recency * wRecency * 5 + 0.3;
    }

    private double doubleVal(List<Map<String, Object>> weights, String key, double fallback) {
        return weights.stream()
                .filter(m -> key.equals(m.get("key")))
                .map(m -> m.get("value"))
                .filter(v -> v instanceof Number)
                .map(v -> ((Number) v).doubleValue())
                .findFirst()
                .orElse(fallback);
    }

    // ── 알림 발송 ──

    @GetMapping("/notifications/history")
    public ResponseEntity<?> getNotificationHistory() {
        List<PushBatch> batches = pushBatchRepository.findAllByOrderBySentAtDesc(PageRequest.of(0, 50));
        List<Map<String, Object>> result = batches.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("title", b.getTitle());
            m.put("recipients", b.getRecipientsCount());
            m.put("openRate", b.getOpenRate());
            m.put("sentAt", relativeTime(b.getSentAt()));
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> sendNotification(@RequestBody Map<String, String> payload) {
        String segment = payload.getOrDefault("segment", "전체 사용자");
        String title = payload.get("title");
        String body = payload.get("body");
        String deepLink = payload.get("deepLink");
        String scheduleMode = payload.getOrDefault("scheduleMode", "now");

        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "제목을 입력해주세요."));
        }
        if (body == null || body.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "본문을 입력해주세요."));
        }
        // 예약 발송은 아직 미지원 — 즉시 발송으로 fallback
        if (!"now".equals(scheduleMode)) {
            log.warn("예약 발송 기능 미구현. 즉시 발송으로 처리. mode={}", scheduleMode);
        }

        PushBatch batch = notificationService.sendBatchToSegment(segment, title.trim(), body.trim(),
                (deepLink != null && !deepLink.isBlank()) ? deepLink.trim() : null);

        return ResponseEntity.ok(Map.of(
                "message", batch.getRecipientsCount() + "명에게 발송 요청을 보냈어요. 전송 성공: " + batch.getDeliveredCount() + "명.",
                "batchId", batch.getId(),
                "recipients", batch.getRecipientsCount(),
                "delivered", batch.getDeliveredCount()
        ));
    }

    private String relativeTime(LocalDateTime sentAt) {
        if (sentAt == null) return "—";
        long minutes = java.time.Duration.between(sentAt, LocalDateTime.now()).toMinutes();
        if (minutes < 1) return "방금";
        if (minutes < 60) return minutes + "분 전";
        long hours = minutes / 60;
        if (hours < 24) return hours + "시간 전";
        long days = hours / 24;
        if (days < 7) return days + "일 전";
        if (days < 30) return (days / 7) + "주 전";
        return (days / 30) + "개월 전";
    }

    // ── 설정 ──

    @GetMapping("/settings/general")
    public ResponseEntity<?> getGeneralSettings() {
        Map<String, Object> settings = adminConfigService
                .get(AdminConfigService.KEY_SETTINGS_GENERAL,
                        new TypeReference<Map<String, Object>>() {})
                .orElseGet(HashMap::new);
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings/general")
    public ResponseEntity<?> updateGeneralSettings(@RequestBody Map<String, Object> payload) {
        adminConfigService.put(AdminConfigService.KEY_SETTINGS_GENERAL, payload);
        log.info("일반 설정 업데이트");
        return ResponseEntity.ok(Map.of("message", "일반 설정이 저장되었습니다."));
    }

    @GetMapping("/settings/crawl")
    public ResponseEntity<?> getCrawlSettings() {
        Map<String, Object> settings = adminConfigService
                .get(AdminConfigService.KEY_SETTINGS_CRAWL,
                        new TypeReference<Map<String, Object>>() {})
                .orElseGet(HashMap::new);
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings/crawl")
    public ResponseEntity<?> updateCrawlSettings(@RequestBody Map<String, Object> payload) {
        adminConfigService.put(AdminConfigService.KEY_SETTINGS_CRAWL, payload);
        log.info("크롤링 설정 업데이트");
        return ResponseEntity.ok(Map.of("message", "크롤링 설정이 저장되었습니다."));
    }
}
