package com.example.demo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ScholarshipDto {
    private String sourceSite;
    private String boardId;
    private Long articleId;
    private String title;
    private String link;
    private String author;
    private LocalDate postedAt;
    private Integer viewCount;
    private boolean notice;
    private boolean hasAttachment;

    private String category; // SCHOLARSHIP / CONTEST / JOB / NOTICE

    private String content;
    private String applyPeriod;
    private String eligibility;
    private String amountInfo;

    // 채용공고 전용 (category=JOB)
    private String companyName;
    private String workLocation;
    private String recruitmentCount;
    private String employmentType;
    private String experienceLevel;

    // 사전 생성된 요약 (잡알리오처럼 구조화된 데이터 — AI 호출 스킵)
    private String prebuiltSummary;

    private List<String> relatedLinks = new ArrayList<>();
    private List<AttachmentDto> attachments = new ArrayList<>();

    public ScholarshipDto(Long articleId, String title, String link) {
        this.articleId = articleId;
        this.title = title;
        this.link = link;
    }
}
