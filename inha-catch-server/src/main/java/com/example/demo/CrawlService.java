package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.ScholarshipAttachment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.demo.event.CrawlEvent;

@Service
public class CrawlService {

    private static final String SOURCE_SITE = "inhatc";
    // 학사공지(14), 입학/취업/일반 추정(15, 16), 장학공지(17)
    private static final String[] BOARD_IDS = {"14", "16", "17"};

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
        List<ScholarshipDto> list = crawler.crawlAllPages("17");
        for (ScholarshipDto dto : list) {
            crawler.crawlDetail(dto);
        }
        return list;
    }

    public String crawlAndSaveAll() throws Exception {
        int publishedCount = 0;
        for (String boardId : BOARD_IDS) {
            List<ScholarshipDto> dtos = crawler.crawlAllPages(boardId);
            for (ScholarshipDto dto : dtos) {
                if (dto.getArticleId() == null) continue;
                crawler.crawlDetail(dto);
                dto.setSourceSite(SOURCE_SITE);
                dto.setBoardId(boardId);
                eventPublisher.publishEvent(new CrawlEvent(dto));
                publishedCount++;
            }
        }
        return "전체 크롤링 수집: " + publishedCount + "건 비동기 파이프라인 대기열 추가 완료";
    }

    public String crawlAndSaveIncremental() throws Exception {
        int publishedCount = 0;
        for (String boardId : BOARD_IDS) {
            long lastArticleId = repository
                    .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, boardId)
                    .map(Scholarship::getArticleId)
                    .orElse(0L);

            List<ScholarshipDto> dtos = crawler.crawlAllPages(boardId);
            for (int i = dtos.size() - 1; i >= 0; i--) {
                ScholarshipDto dto = dtos.get(i);
                if (dto.getArticleId() == null || dto.getArticleId() <= lastArticleId) {
                    continue;
                }
                crawler.crawlDetail(dto);
                dto.setSourceSite(SOURCE_SITE);
                dto.setBoardId(boardId);
                eventPublisher.publishEvent(new CrawlEvent(dto));
                publishedCount++;
            }
        }
        return "증분 크롤링 수집: " + publishedCount + "건 비동기 파이프라인 대기열 추가 완료";
    }

    // 기존의 upsert 메서드는 CrawlPipeline 비동기 워커로 이전되어 삭제되었습니다.

    public String backfillSummaries() {
        List<Scholarship> posts = repository.findAll();
        int updatedCount = 0;
        for (Scholarship postRef : posts) {
            boolean updated = Boolean.TRUE.equals(transactionTemplate.execute(status -> {
                Scholarship post = repository.findById(postRef.getId()).orElse(null);
                if (post == null) return false;
                
                boolean needsSummary = (post.getDetailSummary() == null || post.getDetailSummary().isEmpty() || post.getDetailSummary().contains("오류") || post.getDetailSummary().contains("생략") || post.getDetailSummary().contains("SKIP"));
                
                if (needsSummary) {
                    String combinedText = post.getTitle() + " " + (post.getContent() != null ? post.getContent() : "") + " " + (post.getApplyPeriod() != null ? post.getApplyPeriod() : "");
                    if (combinedText.contains("2025") || combinedText.contains("25년")) {
                        post.setBasicSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
                        post.setDetailSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
                        repository.save(post);
                        return false;
                    }
                    
                    if (post.getContent() != null && !post.getContent().trim().isEmpty()) {
                        System.out.println("Backfilling Unified AI Summary for: " + post.getTitle());
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
                        
                        repository.save(post);
                        return true;
                    }
                }
                return false;
            }));
            
            if (updated) updatedCount++;
        }
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
            // 기존 applyPeriod가 없거나 정규식매칭이 안되어 '상시'로 떨어지는지 확인
            String currentDday = post.getDDay();
            if (currentDday.equals("상시")) {
                post.setApplyPeriod(lastDateStr);
            }
        }
    }
}
