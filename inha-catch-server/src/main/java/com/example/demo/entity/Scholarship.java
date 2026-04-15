package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "scholarship_post",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_source_board_article",
                        columnNames = {"source_site", "board_id", "article_id"}
                )
        },
        indexes = {
                @Index(name = "idx_article_id", columnList = "article_id"),
                @Index(name = "idx_posted_at", columnList = "posted_at"),
                @Index(name = "idx_content_hash", columnList = "content_hash")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Scholarship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_site", nullable = false, length = 50)
    private String sourceSite;

    @Column(name = "board_id", nullable = false, length = 50)
    private String boardId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "title", nullable = false, length = 1000)
    private String title;

    @Column(name = "category", length = 30)
    private String category; // SCHOLARSHIP, CONTEST, NOTICE

    @Column(name = "post_url", nullable = false, length = 2000)
    private String postUrl;

    @Column(name = "author", length = 500)
    private String author;

    @Column(name = "posted_at")
    private LocalDate postedAt;

    @Column(name = "view_count")
    private Integer viewCount;

    @Column(name = "is_notice", nullable = false)
    private boolean notice;

    @Column(name = "has_attachment", nullable = false)
    private boolean hasAttachment;

    @Lob
    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Lob
    @Column(name = "basic_summary", columnDefinition = "LONGTEXT")
    private String basicSummary;

    @Lob
    @Column(name = "detail_summary", columnDefinition = "LONGTEXT")
    private String detailSummary;

    @Lob
    @Column(name = "apply_period", columnDefinition = "LONGTEXT")
    private String applyPeriod;

    @Lob
    @Column(name = "eligibility", columnDefinition = "LONGTEXT")
    private String eligibility;

    @Lob
    @Column(name = "amount_info", columnDefinition = "LONGTEXT")
    private String amountInfo;

    @Lob
    @Column(name = "related_links", columnDefinition = "LONGTEXT")
    private String relatedLinks;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @CreationTimestamp
    @Column(name = "crawled_at", nullable = false, updatable = false)
    private LocalDateTime crawledAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScholarshipAttachment> attachments = new ArrayList<>();

    @Transient
    public String getDDay() {
        if (applyPeriod == null || applyPeriod.trim().isEmpty()) return "상시";
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{4})[./-](\\d{2})[./-](\\d{2})").matcher(applyPeriod);
            String lastDateStr = null;
            while (m.find()) {
                lastDateStr = m.group();
            }
            if (lastDateStr != null) {
                lastDateStr = lastDateStr.replaceAll("[./]", "-");
                java.time.LocalDate endDate = java.time.LocalDate.parse(lastDateStr);
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), endDate);
                if (daysBetween < 0) return "마감";
                if (daysBetween == 0) return "D-Day";
                return "D-" + daysBetween;
            }
        } catch (Exception e) {
            // ignore parse errors
        }
        return "상시";
    }
}
