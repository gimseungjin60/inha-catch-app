package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.ScholarshipAttachment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.demo.event.CrawlEvent;

@Slf4j
@Service
public class CrawlService {

    private static final String SOURCE_SITE = "inhatc";

    private final InhatcCrawler crawler = new InhatcCrawler();
    private final WevityCrawler wevityCrawler = new WevityCrawler();
    private final ThinkContestCrawler thinkContestCrawler = new ThinkContestCrawler();
    private final ScholarshipRepository repository;
    private final GeminiService geminiService;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final JobAlioFetcher jobAlioFetcher;

    public CrawlService(ScholarshipRepository repository, GeminiService geminiService, PlatformTransactionManager transactionManager, ApplicationEventPublisher eventPublisher, JobAlioFetcher jobAlioFetcher) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.eventPublisher = eventPublisher;
        this.jobAlioFetcher = jobAlioFetcher;
    }

    public List<ScholarshipDto> crawlAll() throws Exception {
        List<ScholarshipDto> all = new ArrayList<>();
        all.addAll(crawler.crawlScholarshipPages());
        all.addAll(crawler.crawlContestPages());
        for (ScholarshipDto dto : all) {
            crawler.crawlDetail(dto);
        }
        return all;
    }

    public String crawlAndSaveAll() throws Exception {
        int publishedCount = 0;

        // 1. 장학정보 크롤링
        List<ScholarshipDto> scholarships = crawler.crawlScholarshipPages();
        for (ScholarshipDto dto : scholarships) {
            if (dto.getArticleId() == null) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("17");
            dto.setCategory("SCHOLARSHIP");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 2. 공모전 크롤링
        List<ScholarshipDto> contests = crawler.crawlContestPages();
        for (ScholarshipDto dto : contests) {
            if (dto.getArticleId() == null) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("contest");
            dto.setCategory("CONTEST");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 3. 인하공전 취업게시판
        List<ScholarshipDto> jobs = crawler.crawlJobPages();
        for (ScholarshipDto dto : jobs) {
            if (dto.getArticleId() == null) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("job");
            dto.setCategory("JOB");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 4. 잡알리오 (공공기관 채용정보 OpenAPI) — 진행중인 공고만
        int jobalioPublished = publishJobalio();

        return "전체 크롤링 수집: " + (publishedCount + jobalioPublished)
                + "건 (장학 " + scholarships.size()
                + " + 공모전 " + contests.size()
                + " + 인하취업 " + jobs.size()
                + " + 잡알리오 " + jobalioPublished
                + ") 비동기 파이프라인 대기열 추가 완료";
    }

    public String crawlAndSaveIncremental() throws Exception {
        int publishedCount = 0;

        // 1. 장학정보 증분 크롤링
        long lastScholarshipId = repository
                .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, "17")
                .map(Scholarship::getArticleId)
                .orElse(0L);

        List<ScholarshipDto> scholarships = crawler.crawlScholarshipPages();
        for (int i = scholarships.size() - 1; i >= 0; i--) {
            ScholarshipDto dto = scholarships.get(i);
            if (dto.getArticleId() == null || dto.getArticleId() <= lastScholarshipId) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("17");
            dto.setCategory("SCHOLARSHIP");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 2. 공모전 증분 크롤링
        long lastContestId = repository
                .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, "contest")
                .map(Scholarship::getArticleId)
                .orElse(0L);

        List<ScholarshipDto> contests = crawler.crawlContestPages();
        for (int i = contests.size() - 1; i >= 0; i--) {
            ScholarshipDto dto = contests.get(i);
            if (dto.getArticleId() == null || dto.getArticleId() <= lastContestId) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("contest");
            dto.setCategory("CONTEST");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 3. 인하공전 취업게시판 증분
        long lastJobId = repository
                .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, "job")
                .map(Scholarship::getArticleId)
                .orElse(0L);

        List<ScholarshipDto> jobs = crawler.crawlJobPages();
        for (int i = jobs.size() - 1; i >= 0; i--) {
            ScholarshipDto dto = jobs.get(i);
            if (dto.getArticleId() == null || dto.getArticleId() <= lastJobId) continue;
            crawler.crawlDetail(dto);
            dto.setSourceSite(SOURCE_SITE);
            dto.setBoardId("job");
            dto.setCategory("JOB");
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        // 4. 잡알리오 — 진행중 공고 풀-페치 후 파이프라인이 hash 로 dedup
        int jobalioPublished = publishJobalio();

        return "증분 크롤링 수집: " + (publishedCount + jobalioPublished) + "건 (잡알리오 " + jobalioPublished + ") 비동기 파이프라인 대기열 추가 완료";
    }

    /**
     * 잡알리오 OpenAPI 호출 후 신규/변경분만 파이프라인에 발행.
     * (hash 기반 dedup 은 CrawlPipeline 이 담당)
     */
    private int publishJobalio() {
        if (!jobAlioFetcher.isConfigured()) {
            log.info("[잡알리오] API 키 미설정 — 스킵");
            return 0;
        }
        int count = 0;
        try {
            // 최대 5페이지 × 100건 = 500건 상한 (안전장치)
            List<ScholarshipDto> dtos = jobAlioFetcher.fetchOngoing(5, 100);
            for (ScholarshipDto dto : dtos) {
                if (dto.getArticleId() == null) continue;
                eventPublisher.publishEvent(new CrawlEvent(dto));
                count++;
            }
        } catch (Exception e) {
            log.error("[잡알리오] 발행 실패", e);
        }
        return count;
    }

    public String backfillSummaries() {
        // 페이지 단위로 처리하여 OOM 방지
        int pageNum = 0;
        int pageSize = 50;
        int updatedCount = 0;
        boolean hasMore = true;

        while (hasMore) {
            org.springframework.data.domain.Page<Scholarship> page =
                    repository.findAll(org.springframework.data.domain.PageRequest.of(pageNum, pageSize));
            List<Scholarship> posts = page.getContent();
            hasMore = page.hasNext();
            pageNum++;

        for (Scholarship postRef : posts) {
            boolean updated = Boolean.TRUE.equals(transactionTemplate.execute(status -> {
                Scholarship post = repository.findById(postRef.getId()).orElse(null);
                if (post == null) return false;

                boolean needsSummary = (post.getDetailSummary() == null || post.getDetailSummary().isEmpty() || post.getDetailSummary().contains("오류") || post.getDetailSummary().contains("생략") || post.getDetailSummary().contains("SKIP"));

                if (needsSummary && post.getContent() != null && !post.getContent().trim().isEmpty()) {
                    log.info("Backfilling AI Summary for: {}", post.getTitle());
                    try { Thread.sleep(5000); } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return false;
                    }
                    String summary;
                    try {
                        summary = geminiService.generateSummary(GeminiService.PROMPT_UNIFIED, post.getContent());
                    } catch (Exception e) {
                        log.error("Backfill AI 요약 실패 ({}): {}", post.getTitle(), e.getMessage());
                        return false;
                    }

                    if (summary.contains("SKIP_OLD") || summary.contains("SKIP_DUP")) {
                        post.setBasicSummary("[AI 요약 스킵] 본 공지는 과거 게시물이거나 단순 공지사항입니다.");
                        post.setDetailSummary("[AI 요약 스킵] 본 공지는 과거 게시물이거나 단순 공지사항입니다.");
                    } else {
                        post.setDetailSummary(summary);
                        StringBuilder basic = new StringBuilder();
                        for (String line : summary.split("\n")) {
                            if (line.startsWith("상태:") || line.startsWith("지원 대상:") || line.startsWith("핵심 혜택:")) {
                                basic.append(line).append("\n");
                            }
                        }
                        post.setBasicSummary(basic.toString().trim());
                        extractAndSetDateFromSummary(post, summary);
                    }

                    repository.save(post);
                    return true;
                }
                return false;
            }));

            if (updated) updatedCount++;
        }
        } // end while
        return "과거 데이터 역채우기(Backfill) 완료: " + updatedCount + "건 요약 생성됨";
    }

    public String clearDatabase() {
        long count = repository.count();
        repository.deleteAll();
        return "DB 초기화 완료. 삭제된 기존 공고 수: " + count;
    }

    /**
     * 노후화(과거 연도/마감) 공고 일괄 삭제. 정책 기준은 {@link com.example.demo.pipeline.CrawlPipeline#isOutdated}.
     * currentYear(예: 2026)와 currentYear-1(2025)만 유지.
     */
    public String purgeOutdated() {
        List<Scholarship> all = repository.findAll();
        int deleted = 0;
        int kept = 0;
        for (Scholarship s : all) {
            if (com.example.demo.pipeline.CrawlPipeline.isOutdated(s.getTitle(), s.getContent(), s.getApplyPeriod())) {
                repository.delete(s);
                deleted++;
            } else {
                kept++;
            }
        }
        return "과거 데이터 정리 완료: " + deleted + "건 삭제 / " + kept + "건 유지";
    }

    // ── 외부 크롤링 (위비티/씽굿) ──

    /**
     * 위비티 공모전 크롤링 및 저장 (이벤트 발행)
     */
    public String crawlWevity() throws Exception {
        int publishedCount = 0;
        int failedCount = 0;
        List<ScholarshipDto> dtos = wevityCrawler.crawlAllPages(5); // 5페이지 (~75건)
        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) continue;
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
     * 씽굿 공모전 크롤링 및 저장 (이벤트 발행)
     */
    public String crawlThinkContest() throws Exception {
        int publishedCount = 0;
        int skippedCount = 0;
        List<ScholarshipDto> dtos = thinkContestCrawler.crawlAllPages(20);
        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) continue;
            if (repository.existsBySourceSiteAndBoardIdAndArticleId(dto.getSourceSite(), dto.getBoardId(), dto.getArticleId())) {
                skippedCount++;
                continue;
            }
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }
        return "[씽굿] 크롤링 완료: 신규 " + publishedCount + "건 / 중복 " + skippedCount + "건";
    }

    /**
     * 외부 크롤러 일괄 실행 (위비티 + 씽굿)
     */
    public String crawlAllExternal() throws Exception {
        StringBuilder sb = new StringBuilder();
        try {
            sb.append(crawlWevity()).append("\n");
        } catch (Exception e) {
            log.error("[외부 크롤러] 위비티 실패", e);
            sb.append("[위비티] 크롤링 실패: ").append(e.getMessage()).append("\n");
        }
        try {
            sb.append(crawlThinkContest()).append("\n");
        } catch (Exception e) {
            log.error("[외부 크롤러] 씽굿 실패", e);
            sb.append("[씽굿] 크롤링 실패: ").append(e.getMessage()).append("\n");
        }
        return sb.toString().trim();
    }

    private void extractAndSetDateFromSummary(Scholarship post, String detailSummary) {
        if (detailSummary == null) return;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{4})[./-](\\d{2})[./-](\\d{2})").matcher(detailSummary);
        String lastDateStr = null;
        while (m.find()) {
            lastDateStr = m.group();
        }
        if (lastDateStr != null) {
            String currentDday = post.getDDay();
            if (currentDday != null && currentDday.equals("상시")) {
                post.setApplyPeriod(lastDateStr);
            }
        }
    }
}
