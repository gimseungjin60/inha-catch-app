package com.example.demo.pipeline;

import com.example.demo.FcmService;
import com.example.demo.GeminiService;
import com.example.demo.ScholarshipDto;
import com.example.demo.AttachmentDto;
import com.example.demo.UserRepository;
import com.example.demo.NotificationRepository;
import com.example.demo.entity.CrawlErrorLog;
import com.example.demo.entity.Notification;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.ScholarshipAttachment;
import com.example.demo.entity.User;
import com.example.demo.event.CrawlEvent;
import com.example.demo.repository.CrawlErrorLogRepository;
import com.example.demo.ScholarshipRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CrawlPipeline {

    private static final Logger log = LoggerFactory.getLogger(CrawlPipeline.class);

    private final ScholarshipRepository repository;
    private final GeminiService geminiService;
    private final CrawlErrorLogRepository errorLogRepository;
    private final TransactionTemplate transactionTemplate;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final FcmService fcmService;

    public CrawlPipeline(ScholarshipRepository repository, GeminiService geminiService,
                         CrawlErrorLogRepository errorLogRepository, TransactionTemplate transactionTemplate,
                         UserRepository userRepository, NotificationRepository notificationRepository,
                         FcmService fcmService) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.errorLogRepository = errorLogRepository;
        this.transactionTemplate = transactionTemplate;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.fcmService = fcmService;
    }

    private static final Pattern YEAR_FULL = Pattern.compile("20(\\d{2})");
    private static final Pattern YEAR_SHORT = Pattern.compile("(\\d{2})년");
    private static final Pattern DATE_FULL = Pattern.compile("(\\d{4})[-./](\\d{1,2})[-./](\\d{1,2})");
    private static final String OUTDATED_SUMMARY = "접수 마감되었거나 과거 연도 공지로 판단되어 AI 요약을 생략했습니다.";

    /**
     * 노후화된 공지 여부 판단. 정책: "올해(currentYear)와 전년도(currentYear-1)만 허용".
     *  - 제목/본문/접수기간에 언급된 최대 연도가 (currentYear-1) 미만이면 outdated
     *  - 접수기간에 명시된 모든 날짜가 오늘 이전이면 outdated (마감)
     */
    public static boolean isOutdated(String title, String content, String applyPeriod) {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int cutoffYear = currentYear - 1; // 2026년 기준 2025 허용, 2024 이하 outdated

        String combined = (title != null ? title : "") + " "
                + (content != null ? content : "") + " "
                + (applyPeriod != null ? applyPeriod : "");

        int maxYear = -1;
        Matcher mf = YEAR_FULL.matcher(combined);
        while (mf.find()) {
            int y = 2000 + Integer.parseInt(mf.group(1));
            if (y >= 2000 && y <= currentYear + 5) maxYear = Math.max(maxYear, y);
        }
        Matcher ms = YEAR_SHORT.matcher(combined);
        while (ms.find()) {
            int y = 2000 + Integer.parseInt(ms.group(1));
            if (y >= 2000 && y <= currentYear + 5) maxYear = Math.max(maxYear, y);
        }
        if (maxYear > 0 && maxYear < cutoffYear) return true;

        if (applyPeriod != null && !applyPeriod.isEmpty()) {
            Matcher dm = DATE_FULL.matcher(applyPeriod);
            LocalDate latest = null;
            boolean found = false;
            while (dm.find()) {
                try {
                    LocalDate d = LocalDate.of(
                            Integer.parseInt(dm.group(1)),
                            Integer.parseInt(dm.group(2)),
                            Integer.parseInt(dm.group(3)));
                    found = true;
                    if (latest == null || d.isAfter(latest)) latest = d;
                } catch (Exception ignored) {}
            }
            if (found && latest != null && latest.isBefore(today)) return true;
        }
        return false;
    }

    /**
     * 원본 크롤링 텍스트를 Gemini로 Markdown 구조화. 실패/짧으면 원문 유지.
     * [IMAGES] 섹션은 제거하고 Markdown 변환을 시도.
     */
    private String convertContentToMarkdown(String raw) {
        if (raw == null || raw.trim().isEmpty()) return raw;
        // [IMAGES] 섹션 제거 (이미지 URL은 relatedLinks에 별도 보관됨)
        String stripped = raw.replaceAll("(?s)\\n\\n\\[IMAGES\\].*$", "").trim();
        if (stripped.length() < 200) return stripped;
        try {
            Thread.sleep(3000); // Gemini 레이트리밋 완화
            String md = geminiService.generateSummary(GeminiService.PROMPT_MARKDOWN, stripped);
            if (md == null || md.isBlank() || md.contains("SKIP_SHORT") || md.contains("AI 요약") || md.contains("오류")) {
                return stripped;
            }
            // ```markdown ... ``` 감싸졌으면 벗기기
            md = md.replaceAll("(?s)^```(?:markdown)?\\s*", "").replaceAll("(?s)\\s*```\\s*$", "").trim();
            return md.isEmpty() ? stripped : md;
        } catch (Exception e) {
            log.warn("[Markdown 변환 실패] {}", e.getMessage());
            return stripped;
        }
    }

    private String calculateHash(String input) {
        if (input == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }

    @Async("crawlingThreadPool")
    @EventListener
    public void processCrawlEvent(CrawlEvent event) {
        ScholarshipDto dto = event.getScholarshipDto();
        try {
            transactionTemplate.execute(status -> {
                Scholarship post = repository.findBySourceSiteAndBoardIdAndArticleId(
                        dto.getSourceSite(), dto.getBoardId(), dto.getArticleId()
                ).orElseGet(Scholarship::new);

                String currentHash = calculateHash(dto.getContent() != null ? dto.getContent() : "");
                boolean isNewPost = (post.getId() == null);

                // 해시 기반 변경 감지 (존재하며 해시가 같고 요약본이 정상이면 스킵)
                if (post.getId() != null && currentHash.equals(post.getContentHash()) && post.getBasicSummary() != null && !post.getBasicSummary().contains("오류") && !post.getBasicSummary().contains("내용이 없어")) {
                    log.debug("해시 일치 (수정사항 없음): {}", post.getTitle());
                    return null;
                }

                // 노후화 필터: 새 게시물이면 저장 자체를 생략
                boolean outdated = isOutdated(dto.getTitle(), dto.getContent(), dto.getApplyPeriod());
                if (outdated && isNewPost) {
                    log.info("[스킵] 노후화 데이터 제외: {} ({}/{})", dto.getTitle(), dto.getSourceSite(), dto.getBoardId());
                    return null;
                }

                post.setSourceSite(dto.getSourceSite());
                post.setBoardId(dto.getBoardId());
                post.setArticleId(dto.getArticleId());
                post.setTitle(dto.getTitle());
                post.setPostUrl(dto.getLink());
                post.setAuthor(dto.getAuthor());
                post.setPostedAt(dto.getPostedAt());
                post.setViewCount(dto.getViewCount());
                post.setNotice(dto.isNotice());
                post.setHasAttachment(dto.isHasAttachment());
                post.setContent(convertContentToMarkdown(dto.getContent()));
                post.setContentHash(currentHash);

                if (outdated) {
                    post.setBasicSummary(OUTDATED_SUMMARY);
                    post.setDetailSummary(OUTDATED_SUMMARY);
                } else if (dto.getContent() != null && !dto.getContent().trim().isEmpty()) {
                    log.info("Generating Unified AI Summary for: {}", post.getTitle());
                    try { Thread.sleep(5000); } catch (InterruptedException e) {}
                    String summary = geminiService.generateSummary(GeminiService.PROMPT_UNIFIED, dto.getContent());
                    
                    if (summary.contains("SKIP_OLD") || summary.contains("SKIP_DUP")) {
                        post.setBasicSummary("[AI 요약 스킵] 본 공지는 과거 게시물이거나 단순 공지사항입니다.");
                        post.setDetailSummary("[AI 요약 스킵] 본 공지는 과거 게시물이거나 단순 공지사항입니다.");
                    } else {
                        post.setDetailSummary(summary);
                        StringBuilder basic = new StringBuilder();
                        for(String line : summary.split("\n")) {
                            if(line.startsWith("상태:") || line.startsWith("지원 대상:") || line.startsWith("핵심 혜택:")) {
                                basic.append(line).append("\n");
                            }
                        }
                        post.setBasicSummary(basic.toString().trim());
                        // extractAndSetDateFromSummary 기능을 Pipeline으로 내재화해야 하지만 Entity에 transient 로 구현되어 있음
                    }
                } else {
                    post.setBasicSummary("본문 내용이 없어 요약할 수 없습니다.");
                    post.setDetailSummary("본문 내용이 없어 요약할 수 없습니다.");
                }

                if (dto.getApplyPeriod() != null && !dto.getApplyPeriod().trim().isEmpty()) {
                    post.setApplyPeriod(dto.getApplyPeriod());
                }
                post.setEligibility(dto.getEligibility());
                post.setAmountInfo(dto.getAmountInfo());
                post.setRelatedLinks(String.join("\n", dto.getRelatedLinks()));

                post.getAttachments().clear();
                for (AttachmentDto attachmentDto : dto.getAttachments()) {
                    ScholarshipAttachment attachment = new ScholarshipAttachment();
                    attachment.setFileName(attachmentDto.getFileName());
                    attachment.setFileUrl(attachmentDto.getFileUrl());
                    attachment.setPost(post);
                    post.getAttachments().add(attachment);
                }

                Scholarship saved = repository.save(post);

                // 새 장학금인 경우 매칭 사용자에게 알림 생성
                if (isNewPost) {
                    createNotificationsForMatchingUsers(saved);
                }

                return null;
            });
        } catch (Exception e) {
            log.error("Crawling Pipeline Error for {} : {}", dto.getLink(), e.getMessage());
            errorLogRepository.save(new CrawlErrorLog(dto.getLink(), e.getMessage()));
        }
    }

    private void createNotificationsForMatchingUsers(Scholarship scholarship) {
        try {
            List<User> users = userRepository.findAll();
            String title = scholarship.getTitle() != null ? scholarship.getTitle() : "";

            for (User user : users) {
                if ("ADMIN".equals(user.getRole())) continue;

                boolean matched = false;
                String reason = "";

                // 학과 매칭
                if (user.getMajor() != null && !user.getMajor().trim().isEmpty()) {
                    if (title.contains(user.getMajor())) {
                        matched = true;
                        reason = user.getMajor() + " 학과 관련";
                    }
                }

                // 키워드 매칭
                if (!matched && user.getKeywords() != null && !user.getKeywords().trim().isEmpty()) {
                    String[] keywords = user.getKeywords().split(",");
                    for (String kw : keywords) {
                        String trimmed = kw.trim();
                        if (!trimmed.isEmpty() && title.contains(trimmed)) {
                            matched = true;
                            reason = "'" + trimmed + "' 키워드 매칭";
                            break;
                        }
                    }
                }

                if (matched) {
                    String notiTitle = "새 장학금/공모전 등록";
                    String message = "[" + reason + "] " + title;
                    if (message.length() > 200) message = message.substring(0, 197) + "...";

                    notificationRepository.save(new Notification(user, scholarship, "NEW", notiTitle, message));

                    // FCM 푸시 (토큰 있고 Firebase 설정된 경우만 실제 전송)
                    if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                        fcmService.sendToDevice(user.getFcmToken(), notiTitle, message, scholarship.getId());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("알림 생성 중 오류 (장학금 저장에는 영향 없음): {}", e.getMessage());
        }
    }
}
