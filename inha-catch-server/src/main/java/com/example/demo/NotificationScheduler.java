package com.example.demo;

import com.example.demo.entity.Notification;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.UserBookmark;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);

    private final BookmarkRepository bookmarkRepository;
    private final NotificationRepository notificationRepository;

    public NotificationScheduler(BookmarkRepository bookmarkRepository, NotificationRepository notificationRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.notificationRepository = notificationRepository;
    }

    // 매일 아침 9시에 마감 임박 알림 생성
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDeadlineNotifications() {
        log.info("[알림 스케줄러] 마감 임박 알림 생성 시작");

        List<UserBookmark> allBookmarks = bookmarkRepository.findAll();
        LocalDate today = LocalDate.now();
        int created = 0;

        for (UserBookmark bookmark : allBookmarks) {
            Scholarship scholarship = bookmark.getScholarship();
            long daysLeft = parseDaysUntilDeadline(scholarship, today);

            if (daysLeft == 3) {
                String title = "마감 임박 알림";
                String message = "북마크한 '" + scholarship.getTitle() + "'의 마감이 3일 남았습니다!";
                if (message.length() > 200) message = message.substring(0, 197) + "...";

                notificationRepository.save(
                    new Notification(bookmark.getUser(), scholarship, "DEADLINE", title, message)
                );
                created++;
            }
        }

        log.info("[알림 스케줄러] 마감 임박 알림 {}건 생성 완료", created);
    }

    private long parseDaysUntilDeadline(Scholarship scholarship, LocalDate today) {
        if (scholarship.getApplyPeriod() == null || scholarship.getApplyPeriod().trim().isEmpty()) {
            return -1;
        }
        try {
            Matcher m = Pattern.compile("(\\d{4})[./-](\\d{2})[./-](\\d{2})").matcher(scholarship.getApplyPeriod());
            String lastDateStr = null;
            while (m.find()) {
                lastDateStr = m.group();
            }
            if (lastDateStr != null) {
                lastDateStr = lastDateStr.replaceAll("[./]", "-");
                LocalDate endDate = LocalDate.parse(lastDateStr);
                return ChronoUnit.DAYS.between(today, endDate);
            }
        } catch (Exception e) {
            // 파싱 실패 무시
        }
        return -1;
    }
}
