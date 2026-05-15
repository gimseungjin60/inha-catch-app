package com.example.demo;

import com.example.demo.entity.Notification;
import com.example.demo.entity.PushBatch;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.repository.PushBatchRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final BookmarkRepository bookmarkRepository;
    private final FCMService fcmService;
    private final PushBatchRepository pushBatchRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               BookmarkRepository bookmarkRepository,
                               FCMService fcmService,
                               PushBatchRepository pushBatchRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.fcmService = fcmService;
        this.pushBatchRepository = pushBatchRepository;
    }

    /**
     * 어드민이 일괄 알림 발송.
     * @param segment 대상 세그먼트 (전체 사용자 / 특정 학과 구독자 / 관심 키워드 매칭 / 최근 30일 활성 사용자)
     * @param title   알림 제목
     * @param body    알림 본문
     * @param deepLink 클릭 시 이동 경로 (선택)
     */
    @Transactional
    public PushBatch sendBatchToSegment(String segment, String title, String body, String deepLink) {
        List<User> targets = resolveSegmentTargets(segment);

        Map<String, String> data = new HashMap<>();
        data.put("type", "SYSTEM");
        if (deepLink != null && !deepLink.isBlank()) {
            data.put("deepLink", deepLink);
        }

        int delivered = 0;
        for (User user : targets) {
            // DB 저장 — 사용자 별 알림 row
            Notification notification = new Notification(
                    user, null, "SYSTEM",
                    truncate(title, 150),
                    truncate(body, 950)
            );
            notificationRepository.save(notification);

            // FCM 발송 (토큰 있는 사용자만)
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    fcmService.sendToUser(user.getFcmToken(), title, body, data);
                    delivered++;
                } catch (Exception e) {
                    log.warn("FCM 발송 실패 user={}: {}", user.getEmail(), e.getMessage());
                }
            }
        }

        PushBatch batch = new PushBatch(title, body, segment, deepLink,
                targets.size(), delivered);
        pushBatchRepository.save(batch);
        log.info("일괄 알림 발송 완료: segment={} recipients={} delivered={}",
                segment, targets.size(), delivered);
        return batch;
    }

    private List<User> resolveSegmentTargets(String segment) {
        List<User> activeUsers = userRepository.findByFcmTokenIsNotNullAndIsActiveTrue();
        if (segment == null) return activeUsers;

        switch (segment) {
            case "특정 학과 구독자":
                return activeUsers.stream()
                        .filter(u -> u.getMajor() != null && !u.getMajor().isBlank())
                        .collect(Collectors.toList());
            case "관심 키워드 매칭":
                return activeUsers.stream()
                        .filter(u -> u.getKeywords() != null && !u.getKeywords().isBlank())
                        .collect(Collectors.toList());
            case "최근 30일 활성 사용자": {
                LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
                return activeUsers.stream()
                        .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(cutoff))
                        .collect(Collectors.toList());
            }
            case "전체 사용자":
            default:
                return activeUsers;
        }
    }

    /**
     * 새 장학금이 크롤링되었을 때 관련 사용자에게 알림 발송
     */
    @Async("crawlingThreadPool")
    @Transactional
    public void notifyNewScholarship(Scholarship scholarship) {
        String title = scholarship.getTitle();
        if (title == null || title.isBlank()) return;

        // FCM 토큰이 등록된 활성 사용자 조회
        List<User> usersWithFcm = userRepository.findByFcmTokenIsNotNullAndIsActiveTrue();
        if (usersWithFcm.isEmpty()) return;

        String scholarshipLower = (title + " " +
                nullSafe(scholarship.getEligibility()) + " " +
                nullSafe(scholarship.getBasicSummary())).toLowerCase();

        int notifiedCount = 0;

        for (User user : usersWithFcm) {
            // 사용자 키워드/학과와 장학금 매칭 여부 확인
            if (!isRelevantToUser(user, scholarshipLower)) continue;

            // DB에 알림 저장
            String message = truncate(nullSafe(scholarship.getBasicSummary()), 150);
            Notification notification = new Notification(
                    user, scholarship, "NEW",
                    "새 장학금/공모전: " + truncate(title, 50),
                    message
            );
            notificationRepository.save(notification);

            // FCM 푸시 발송
            Map<String, String> data = new HashMap<>();
            data.put("type", "NEW");
            data.put("scholarshipId", String.valueOf(scholarship.getId()));
            fcmService.sendToUser(user.getFcmToken(),
                    "새 장학금/공모전 등록",
                    truncate(title, 100),
                    data);

            notifiedCount++;
        }

        if (notifiedCount > 0) {
            log.info("새 장학금 알림 발송 완료: '{}' → {}명", truncate(title, 30), notifiedCount);
        }
    }

    /**
     * 마감 임박 알림 (매일 오전 9시 실행)
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDeadlineAlerts() {
        log.info("마감 임박 알림 스케줄러 시작");

        List<User> usersWithFcm = userRepository.findByFcmTokenIsNotNullAndIsActiveTrue();

        int totalNotified = 0;

        for (User user : usersWithFcm) {
            // 사용자가 북마크한 장학금 중 마감 임박인 것 조회
            List<Scholarship> bookmarkedScholarships = bookmarkRepository.findScholarshipsByUser(user);

            for (Scholarship scholarship : bookmarkedScholarships) {
                String dDay = scholarship.getDDay();
                if (dDay == null || dDay.equals("마감") || dDay.equals("상시")) continue;

                // D-3 이내인 것만 알림
                try {
                    int daysLeft = Integer.parseInt(dDay.replace("D-", ""));
                    if (daysLeft > 3 || daysLeft < 0) continue;
                } catch (NumberFormatException e) {
                    continue;
                }

                // 같은 장학금에 대해 오늘 이미 알림을 보냈는지 확인
                boolean alreadyNotified = notificationRepository
                        .existsByUserAndScholarshipAndTypeAndCreatedAtAfter(
                                user, scholarship, "DEADLINE",
                                LocalDate.now().atStartOfDay()
                        );
                if (alreadyNotified) continue;

                // 알림 저장
                Notification notification = new Notification(
                        user, scholarship, "DEADLINE",
                        "마감 임박: " + truncate(scholarship.getTitle(), 50),
                        dDay + " 마감 예정입니다. 서둘러 지원하세요!"
                );
                notificationRepository.save(notification);

                // FCM 발송
                Map<String, String> data = new HashMap<>();
                data.put("type", "DEADLINE");
                data.put("scholarshipId", String.valueOf(scholarship.getId()));
                fcmService.sendToUser(user.getFcmToken(),
                        "마감 임박! " + dDay,
                        truncate(scholarship.getTitle(), 100),
                        data);

                totalNotified++;
            }
        }

        log.info("마감 임박 알림 발송 완료: {}건", totalNotified);
    }

    private boolean isRelevantToUser(User user, String scholarshipTextLower) {
        // 키워드 매칭
        String keywords = user.getKeywords();
        if (keywords != null && !keywords.isBlank()) {
            for (String keyword : keywords.split(",")) {
                String kw = keyword.trim().toLowerCase();
                if (!kw.isEmpty() && scholarshipTextLower.contains(kw)) {
                    return true;
                }
            }
        }

        // 학과 매칭
        String major = user.getMajor();
        if (major != null && !major.isBlank()) {
            if (scholarshipTextLower.contains(major.toLowerCase())) {
                return true;
            }
        }

        return false;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "..." : text;
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }
}
