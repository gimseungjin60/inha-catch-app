package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.event.CrawlEvent;
import com.example.demo.pipeline.CrawlPipeline;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Service
public class CrawlService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CrawlService.class);

    private static final String SOURCE_SITE = "inhatc";
    // 학사공지(14), 입학/취업/일반 추정(15, 16), 장학공지(17)
    private static final String[] BOARD_IDS = {"14", "16", "17"};

    private final InhatcCrawler crawler = new InhatcCrawler();
    private final WevityCrawler wevityCrawler = new WevityCrawler();
    private final ThinkContestCrawler thinkContestCrawler = new ThinkContestCrawler();
    private final ScholarshipRepository repository;
    private final GeminiService geminiService;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;

    public CrawlService(ScholarshipRepository repository, GeminiService geminiService, PlatformTransactionManager transactionManager, ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.eventPublisher = eventPublisher;
    }

    public List<ScholarshipDto> crawlAll() throws Exception {
        List<ScholarshipDto> list = crawler.crawlAllPages("17");
        for (ScholarshipDto dto : list) {
            crawler.crawlDetail(dto);
        }
        return list;
    }

    public String crawlAndSaveAll() {
        int publishedCount = 0;
        int failedCount = 0;
        for (String boardId : BOARD_IDS) {
            List<ScholarshipDto> dtos;
            try {
                dtos = crawler.crawlAllPages(boardId);
            } catch (Exception e) {
                log.error("[인하공전] 목록 크롤링 실패 boardId={}: {}", boardId, e.getMessage());
                failedCount++;
                continue;
            }
            for (ScholarshipDto dto : dtos) {
                if (dto.getArticleId() == null) continue;
                try {
                    crawler.crawlDetail(dto);
                    dto.setSourceSite(SOURCE_SITE);
                    dto.setBoardId(boardId);
                    eventPublisher.publishEvent(new CrawlEvent(dto));
                    publishedCount++;
                } catch (Exception e) {
                    log.warn("[인하공전] 상세 크롤링 실패 link={}: {}", dto.getLink(), e.getMessage());
                    failedCount++;
                }
            }
        }
        return "전체 크롤링 수집: 성공 " + publishedCount + "건 / 실패 " + failedCount + "건 (비동기 파이프라인 대기열 추가 완료)";
    }

    public String crawlAndSaveIncremental() {
        int publishedCount = 0;
        int failedCount = 0;
        for (String boardId : BOARD_IDS) {
            long lastArticleId = repository
                    .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, boardId)
                    .map(Scholarship::getArticleId)
                    .orElse(0L);

            List<ScholarshipDto> dtos;
            try {
                dtos = crawler.crawlAllPages(boardId);
            } catch (Exception e) {
                log.error("[인하공전 증분] 목록 크롤링 실패 boardId={}: {}", boardId, e.getMessage());
                failedCount++;
                continue;
            }
            for (int i = dtos.size() - 1; i >= 0; i--) {
                ScholarshipDto dto = dtos.get(i);
                if (dto.getArticleId() == null || dto.getArticleId() <= lastArticleId) {
                    continue;
                }
                try {
                    crawler.crawlDetail(dto);
                    dto.setSourceSite(SOURCE_SITE);
                    dto.setBoardId(boardId);
                    eventPublisher.publishEvent(new CrawlEvent(dto));
                    publishedCount++;
                } catch (Exception e) {
                    log.warn("[인하공전 증분] 상세 크롤링 실패 link={}: {}", dto.getLink(), e.getMessage());
                    failedCount++;
                }
            }
        }
        return "증분 크롤링 수집: 성공 " + publishedCount + "건 / 실패 " + failedCount + "건";
    }

    // ── 외부 크롤링 ──

    /**
     * 위비티 공모전 크롤링 및 저장
     */
    public String crawlWevity() throws Exception {
        int publishedCount = 0;
        int failedCount = 0;
        List<ScholarshipDto> dtos = wevityCrawler.crawlAllPages(5); // 5페이지 (약 75건)
        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) continue;
            // 이미 존재하는 항목 스킵
            if (repository.existsBySourceSiteAndBoardIdAndArticleId(dto.getSourceSite(), dto.getBoardId(), dto.getArticleId())) {
                continue;
            }
            try {
                wevityCrawler.crawlDetail(dto);
                eventPublisher.publishEvent(new CrawlEvent(dto));
                publishedCount++;
            } catch (Exception e) {
                log.warn("[위비티] 상세 크롤링 실패 link={}: {}", dto.getLink(), e.getMessage());
                failedCount++;
            }
        }
        return "[위비티] 크롤링 완료: 성공 " + publishedCount + "건 / 실패 " + failedCount + "건";
    }

    /**
     * 씽굿 공모전 크롤링 및 저장
     */
    public String crawlThinkContest() throws Exception {
        int publishedCount = 0;
        int skippedCount = 0;
        List<ScholarshipDto> dtos = thinkContestCrawler.crawlAllPages(20); // 추가 20개 PK 탐색
        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) continue;
            if (repository.existsBySourceSiteAndBoardIdAndArticleId(dto.getSourceSite(), dto.getBoardId(), dto.getArticleId())) {
                skippedCount++;
                continue;
            }
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }
        return "[씽굿] 크롤링 완료: 신규 " + publishedCount + "건 / 기존 " + skippedCount + "건 스킵";
    }

    /**
     * 모든 외부 사이트 일괄 크롤링
     */
    public String crawlAllExternal() throws Exception {
        StringBuilder result = new StringBuilder();
        try {
            result.append(crawlWevity()).append("\n");
        } catch (Exception e) {
            log.error("[위비티] 크롤링 실패: {}", e.getMessage());
            result.append("[위비티] 크롤링 실패: ").append(e.getMessage()).append("\n");
        }
        try {
            result.append(crawlThinkContest()).append("\n");
        } catch (Exception e) {
            log.error("[씽굿] 크롤링 실패: {}", e.getMessage());
            result.append("[씽굿] 크롤링 실패: ").append(e.getMessage()).append("\n");
        }
        return result.toString().trim();
    }

    public String backfillSummaries() {
        List<Scholarship> posts = repository.findAll();
        int updatedCount = 0;
        int markdownCount = 0;
        for (Scholarship postRef : posts) {
            Boolean[] flags = transactionTemplate.execute(status -> {
                Scholarship post = repository.findById(postRef.getId()).orElse(null);
                if (post == null) return new Boolean[]{false, false};
                boolean summaryUpdated = false;
                boolean markdownUpdated = false;

                // Markdown 변환: 아직 Markdown 형태가 아니고 본문이 충분히 길면 변환
                String content = post.getContent();
                boolean looksMarkdown = content != null && (content.contains("\n## ") || content.startsWith("## ") || content.contains("\n- ") || content.contains("**"));
                if (content != null && content.length() > 200 && !looksMarkdown) {
                    try {
                        String stripped = content.replaceAll("(?s)\\n\\n\\[IMAGES\\].*$", "").trim();
                        Thread.sleep(3000);
                        String md = geminiService.generateSummary(GeminiService.PROMPT_MARKDOWN, stripped);
                        if (md != null && !md.isBlank() && !md.contains("SKIP_SHORT") && !md.contains("AI 요약") && !md.contains("오류")) {
                            md = md.replaceAll("(?s)^```(?:markdown)?\\s*", "").replaceAll("(?s)\\s*```\\s*$", "").trim();
                            if (!md.isEmpty()) {
                                post.setContent(md);
                                markdownUpdated = true;
                            }
                        }
                    } catch (Exception e) {
                        log.warn("[Backfill Markdown 실패] {}: {}", post.getTitle(), e.getMessage());
                    }
                }

                boolean needsSummary = (post.getDetailSummary() == null || post.getDetailSummary().isEmpty() || post.getDetailSummary().contains("오류") || post.getDetailSummary().contains("생략") || post.getDetailSummary().contains("SKIP"));

                if (needsSummary) {
                    if (CrawlPipeline.isOutdated(post.getTitle(), post.getContent(), post.getApplyPeriod())) {
                        String msg = "접수 마감되었거나 과거 연도 공지로 판단되어 AI 요약을 생략했습니다.";
                        post.setBasicSummary(msg);
                        post.setDetailSummary(msg);
                        repository.save(post);
                        return new Boolean[]{false, markdownUpdated};
                    }

                    if (post.getContent() != null && !post.getContent().trim().isEmpty()) {
                        log.info("Backfilling Unified AI Summary for: {}", post.getTitle());
                        try { Thread.sleep(5000); } catch (InterruptedException e) {}
                        String summary = geminiService.generateSummary(GeminiService.PROMPT_UNIFIED, post.getContent());

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
                            extractAndSetDateFromSummary(post, summary);
                        }

                        summaryUpdated = true;
                    }
                }

                if (summaryUpdated || markdownUpdated) {
                    repository.save(post);
                }
                return new Boolean[]{summaryUpdated, markdownUpdated};
            });

            if (flags != null && Boolean.TRUE.equals(flags[0])) updatedCount++;
            if (flags != null && Boolean.TRUE.equals(flags[1])) markdownCount++;
        }
        return "Backfill 완료: 요약 " + updatedCount + "건 / Markdown " + markdownCount + "건 갱신됨";
    }

    public String clearDatabase() {
        long count = repository.count();
        repository.deleteAll();
        return "DB 초기화 완료. 삭제된 기존 공고 수: " + count;
    }

    /**
     * 2024년 이하 과거 공고 일괄 삭제 (isOutdated 정책 기준).
     * currentYear(2026)와 currentYear-1(2025)만 유지.
     */
    public String purgeOutdated() {
        List<Scholarship> all = repository.findAll();
        int deleted = 0;
        int kept = 0;
        for (Scholarship s : all) {
            if (CrawlPipeline.isOutdated(s.getTitle(), s.getContent(), s.getApplyPeriod())) {
                repository.delete(s);
                deleted++;
            } else {
                kept++;
            }
        }
        return "과거 데이터 정리 완료: " + deleted + "건 삭제 / " + kept + "건 유지";
    }

    private void extractAndSetDateFromSummary(Scholarship post, String detailSummary) {
        if (detailSummary == null) return;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{4})[./-](\\d{2})[./-](\\d{2})").matcher(detailSummary);
        String lastDateStr = null;
        while (m.find()) {
            lastDateStr = m.group();
        }
        if (lastDateStr != null) {
            // 기존 applyPeriod가 없거나 정규식매칭이 안되어 '상시'로 떨어지는지 확인
            String currentDday = post.getDDay();
            if (currentDday.equals("상시")) {
                post.setApplyPeriod(lastDateStr);
            }
        }
    }
}
