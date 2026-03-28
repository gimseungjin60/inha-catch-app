package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.ScholarshipAttachment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CrawlService {

    private static final String SOURCE_SITE = "inhatc";
    private static final String BOARD_ID = "17";

    private final InhatcCrawler crawler = new InhatcCrawler();
    private final ScholarshipRepository repository;
    private final GeminiService geminiService;

    public CrawlService(ScholarshipRepository repository, GeminiService geminiService) {
        this.repository = repository;
        this.geminiService = geminiService;
    }

    public List<ScholarshipDto> crawlAll() throws Exception {
        List<ScholarshipDto> list = crawler.crawlAllPages();
        for (ScholarshipDto dto : list) {
            crawler.crawlDetail(dto);
        }
        return list;
    }

    @Transactional
    public String crawlAndSaveAll() throws Exception {
        List<ScholarshipDto> dtos = crawler.crawlAllPages();
        int savedCount = 0;

        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) {
                continue;
            }
            crawler.crawlDetail(dto);
            upsert(dto);
            savedCount++;
        }

        return "전체 크롤링 저장 완료: " + savedCount + "건";
    }

    @Transactional
    public String crawlAndSaveIncremental() throws Exception {
        long lastArticleId = repository
                .findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(SOURCE_SITE, BOARD_ID)
                .map(Scholarship::getArticleId)
                .orElse(0L);

        List<ScholarshipDto> dtos = crawler.crawlAllPages();
        int savedCount = 0;

        for (ScholarshipDto dto : dtos) {
            if (dto.getArticleId() == null) {
                continue;
            }
            if (dto.getArticleId() <= lastArticleId) {
                continue;
            }

            crawler.crawlDetail(dto);
            upsert(dto);
            savedCount++;
        }

        return "증분 크롤링 저장 완료: " + savedCount + "건";
    }

    private void upsert(ScholarshipDto dto) {
        Scholarship post = repository
                .findBySourceSiteAndBoardIdAndArticleId(SOURCE_SITE, BOARD_ID, dto.getArticleId())
                .orElseGet(Scholarship::new);

        post.setSourceSite(SOURCE_SITE);
        post.setBoardId(BOARD_ID);
        post.setArticleId(dto.getArticleId());
        post.setTitle(dto.getTitle());
        post.setPostUrl(dto.getLink());
        post.setAuthor(dto.getAuthor());
        post.setPostedAt(dto.getPostedAt());
        post.setViewCount(dto.getViewCount());
        post.setNotice(dto.isNotice());
        post.setHasAttachment(dto.isHasAttachment());
        post.setContent(dto.getContent());
        
        // AI Summary 생성이 필요한지 확인
        boolean needsBasic = (post.getBasicSummary() == null || post.getBasicSummary().isEmpty() || post.getBasicSummary().contains("오류") || post.getBasicSummary().contains("생략"));
        boolean needsDetail = (post.getDetailSummary() == null || post.getDetailSummary().isEmpty() || post.getDetailSummary().contains("오류") || post.getDetailSummary().contains("생략"));
        
        if (needsBasic || needsDetail) {
            String combinedText = post.getTitle() + " " + (dto.getContent() != null ? dto.getContent() : "") + " " + (dto.getApplyPeriod() != null ? dto.getApplyPeriod() : "");
            if (combinedText.contains("2025") || combinedText.contains("25년")) {
                post.setBasicSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
                post.setDetailSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
            } else if (dto.getContent() != null && !dto.getContent().trim().isEmpty()) {
                System.out.println("Generating AI Summaries for: " + post.getTitle());
                boolean skipped = false;
                if (needsBasic) {
                    try { Thread.sleep(3000); } catch (InterruptedException e) {}
                    String bSum = geminiService.generateSummary(GeminiService.PROMPT_BASIC, dto.getContent());
                    if (bSum.contains("SKIP")) {
                        bSum = "[AI 요약 스킵] 본 공지는 2026 일반 대상 장학/공모 정보가 아니거나 이미 종료되어 요약이 생략되었습니다.";
                        skipped = true;
                    }
                    post.setBasicSummary(bSum);
                } else if (post.getBasicSummary() != null && post.getBasicSummary().contains("스킵")) {
                    skipped = true;
                }
                
                if (needsDetail && !skipped) {
                    try { Thread.sleep(3000); } catch (InterruptedException e) {}
                    String detailSum = geminiService.generateSummary(GeminiService.PROMPT_DETAIL, dto.getContent());
                    post.setDetailSummary(detailSum);
                    extractAndSetDateFromSummary(post, detailSum);
                } else if (skipped) {
                    post.setDetailSummary("특수 목적 또는 종료된 공지로 분류되어 상세 요약이 생략되었습니다.");
                }
            } else {
                post.setBasicSummary("본문 내용이 없어 요약할 수 없습니다.");
                post.setDetailSummary("본문 내용이 없어 요약할 수 없습니다.");
            }
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

        repository.save(post);
    }

    @Transactional
    public String backfillSummaries() {
        List<Scholarship> posts = repository.findAll();
        int updatedCount = 0;
        for (Scholarship post : posts) {
            boolean needsBasic = (post.getBasicSummary() == null || post.getBasicSummary().isEmpty() || post.getBasicSummary().contains("오류"));
            boolean needsDetail = (post.getDetailSummary() == null || post.getDetailSummary().isEmpty() || post.getDetailSummary().contains("오류"));
            
            if (needsBasic || needsDetail) {
                String combinedText = post.getTitle() + " " + (post.getContent() != null ? post.getContent() : "") + " " + (post.getApplyPeriod() != null ? post.getApplyPeriod() : "");
                if (combinedText.contains("2025") || combinedText.contains("25년")) {
                    post.setBasicSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
                    post.setDetailSummary("2025년도 이전 공지로 판단되어 AI 요약을 생략했습니다.");
                    repository.save(post);
                    continue;
                }
                
                if (post.getContent() != null && !post.getContent().trim().isEmpty()) {
                    System.out.println("Backfilling AI Summaries for: " + post.getTitle());
                    boolean skipped = false;
                    if (needsBasic) {
                        try { Thread.sleep(3000); } catch (InterruptedException e) {}
                        String bSum = geminiService.generateSummary(GeminiService.PROMPT_BASIC, post.getContent());
                        if (bSum.contains("SKIP")) {
                            bSum = "[AI 요약 스킵] 본 공지는 2026 일반 대상 장학/공모 정보가 아니거나 이미 종료되어 요약이 생략되었습니다.";
                            skipped = true;
                        }
                        post.setBasicSummary(bSum);
                    } else if (post.getBasicSummary() != null && post.getBasicSummary().contains("스킵")) {
                        skipped = true;
                    }
                    
                    if (needsDetail && !skipped) {
                        try { Thread.sleep(3000); } catch (InterruptedException e) {}
                        String detailSum = geminiService.generateSummary(GeminiService.PROMPT_DETAIL, post.getContent());
                        post.setDetailSummary(detailSum);
                        extractAndSetDateFromSummary(post, detailSum);
                    } else if (skipped) {
                        post.setDetailSummary("특수 목적 또는 종료된 공지로 분류되어 상세 요약이 생략되었습니다.");
                    }
                    
                    repository.save(post);
                    updatedCount++;
                }
            }
        }
        return "과거 데이터 역채우기(Backfill) 완료: " + updatedCount + "건 요약 생성됨";
    }

    @Transactional
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
