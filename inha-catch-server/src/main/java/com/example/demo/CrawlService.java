package com.example.demo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CrawlService {

    private static final String SOURCE_SITE = "inhatc";
    private static final String BOARD_ID = "17";

    private final InhatcCrawler crawler = new InhatcCrawler();
    private final ScholarshipRepository repository;

    public CrawlService(ScholarshipRepository repository) {
        this.repository = repository;
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
        post.setSummary(null);
        post.setApplyPeriod(dto.getApplyPeriod());
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
}
