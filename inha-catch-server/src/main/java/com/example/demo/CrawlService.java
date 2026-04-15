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
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        return "전체 크롤링 수집: " + publishedCount + "건 (장학 " + scholarships.size() + " + 공모전 " + contests.size() + ") 비동기 파이프라인 대기열 추가 완료";
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
            eventPublisher.publishEvent(new CrawlEvent(dto));
            publishedCount++;
        }

        return "증분 크롤링 수집: " + publishedCount + "건 비동기 파이프라인 대기열 추가 완료";
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
