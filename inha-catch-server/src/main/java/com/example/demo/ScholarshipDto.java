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
    private Long articleId;
    private String title;
    private String link;
    private String author;
    private LocalDate postedAt;
    private Integer viewCount;
    private boolean notice;
    private boolean hasAttachment;

    private String content;
    private String applyPeriod;
    private String eligibility;
    private String amountInfo;

    private List<String> relatedLinks = new ArrayList<>();
    private List<AttachmentDto> attachments = new ArrayList<>();

    public ScholarshipDto(Long articleId, String title, String link) {
        this.articleId = articleId;
        this.title = title;
        this.link = link;
    }
}
