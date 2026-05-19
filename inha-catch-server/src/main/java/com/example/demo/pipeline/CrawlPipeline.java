package com.example.demo.pipeline;

import com.example.demo.GeminiService;
import com.example.demo.ScholarshipDto;
import com.example.demo.AttachmentDto;
import com.example.demo.entity.CrawlErrorLog;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.ScholarshipAttachment;
import com.example.demo.event.CrawlEvent;
import com.example.demo.repository.CrawlErrorLogRepository;
import com.example.demo.ScholarshipRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Slf4j
@Service
public class CrawlPipeline {

    private final ScholarshipRepository repository;
    private final GeminiService geminiService;
    private final CrawlErrorLogRepository errorLogRepository;
    private final TransactionTemplate transactionTemplate;
    private final com.example.demo.NotificationService notificationService;

    public CrawlPipeline(ScholarshipRepository repository, GeminiService geminiService,
                         CrawlErrorLogRepository errorLogRepository, TransactionTemplate transactionTemplate,
                         com.example.demo.NotificationService notificationService) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.errorLogRepository = errorLogRepository;
        this.transactionTemplate = transactionTemplate;
        this.notificationService = notificationService;
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
            Scholarship savedPost = transactionTemplate.execute(status -> {
                Scholarship post = repository.findBySourceSiteAndBoardIdAndArticleId(
                        dto.getSourceSite(), dto.getBoardId(), dto.getArticleId()
                ).orElseGet(Scholarship::new);

                String currentHash = calculateHash(dto.getContent() != null ? dto.getContent() : "");
                
                // 해시 기반 변경 감지 (존재하며 해시가 같고 요약본이 정상이면 스킵)
                if (post.getId() != null && currentHash.equals(post.getContentHash()) && post.getBasicSummary() != null && !post.getBasicSummary().contains("오류") && !post.getBasicSummary().contains("내용이 없어")) {
                    log.debug("해시 일치 (수정사항 없음): {}", post.getTitle());
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
                post.setContent(dto.getContent());
                post.setContentHash(currentHash);
                if (dto.getCategory() != null) post.setCategory(dto.getCategory());
                post.setCompanyName(dto.getCompanyName());
                post.setWorkLocation(dto.getWorkLocation());
                post.setRecruitmentCount(dto.getRecruitmentCount());
                post.setEmploymentType(dto.getEmploymentType());
                post.setExperienceLevel(dto.getExperienceLevel());

                // 2025년 이전 데이터 또는 날짜 없는 데이터는 저장하지 않음
                if (dto.getPostedAt() == null || dto.getPostedAt().getYear() < 2025) {
                    log.debug("2025년 이전 또는 날짜 없는 데이터 스킵: {}", post.getTitle());
                    return null;
                }

                // 구조화 소스(잡알리오 등)는 prebuilt 요약을 가져왔으므로 Gemini 호출 스킵
                if (dto.getPrebuiltSummary() != null && !dto.getPrebuiltSummary().isBlank()) {
                    String pre = dto.getPrebuiltSummary();
                    post.setDetailSummary(pre);
                    StringBuilder basic = new StringBuilder();
                    for (String line : pre.split("\n")) {
                        if (line.startsWith("상태:") || line.startsWith("지원 대상:") || line.startsWith("핵심 혜택:")) {
                            basic.append(line).append("\n");
                        }
                    }
                    post.setBasicSummary(basic.toString().trim());
                } else if (dto.getContent() != null && !dto.getContent().trim().isEmpty()) {
                    log.info("Generating Unified AI Summary for: {}", post.getTitle());
                    try { Thread.sleep(15000); } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return null;
                    }
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
                return saved;
            });

            // 새로 저장된 장학금이면 알림 발송
            if (savedPost != null && savedPost.getId() != null) {
                notificationService.notifyNewScholarship(savedPost);
            }
        } catch (Exception e) {
            log.error("Crawling Pipeline Error for {} : {}", dto.getLink(), e.getMessage());
            errorLogRepository.save(new CrawlErrorLog(dto.getLink(), e.getMessage()));
        }
    }
}
