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
        java.time.LocalDate endDate = parseLatestDate(applyPeriod);
        // applyPeriod 비어있을 때만 AI 요약에서 폴백 (title은 "2026-1차" 같은 오파싱 위험)
        if (endDate == null) endDate = parseLatestDate(detailSummary);
        if (endDate == null) endDate = parseLatestDate(basicSummary);
        if (endDate == null) return "상시";
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), endDate);
        if (daysBetween < 0) return "마감";
        if (daysBetween == 0) return "D-Day";
        return "D-" + daysBetween;
    }

    /**
     * 문자열에서 마지막(가장 늦은) 날짜를 파싱. 다음 포맷 지원:
     *   - 2026-05-15, 2026.5.1, 2026/5/1  (자리수 가변)
     *   - 2026년 5월 15일
     *   - 5월 15일 / 5.15 / 5/15 (연도 없는 경우 현재 연도 가정)
     * 파싱 실패 시 null 반환.
     */
    public static java.time.LocalDate parseLatestDate(String text) {
        if (text == null || text.trim().isEmpty()) return null;
        java.util.List<java.time.LocalDate> candidates = new java.util.ArrayList<>();
        int currentYear = java.time.LocalDate.now().getYear();

        try {
            // 1) yyyy[-./ ]M[-./ ]d
            java.util.regex.Matcher m1 = java.util.regex.Pattern
                    .compile("(\\d{4})\\s*[-./]\\s*(\\d{1,2})\\s*[-./]\\s*(\\d{1,2})")
                    .matcher(text);
            while (m1.find()) {
                try {
                    candidates.add(java.time.LocalDate.of(
                            Integer.parseInt(m1.group(1)),
                            Integer.parseInt(m1.group(2)),
                            Integer.parseInt(m1.group(3))));
                } catch (Exception ignored) {}
            }

            // 2) yyyy년 M월 d일
            java.util.regex.Matcher m2 = java.util.regex.Pattern
                    .compile("(\\d{4})\\s*년\\s*(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일")
                    .matcher(text);
            while (m2.find()) {
                try {
                    candidates.add(java.time.LocalDate.of(
                            Integer.parseInt(m2.group(1)),
                            Integer.parseInt(m2.group(2)),
                            Integer.parseInt(m2.group(3))));
                } catch (Exception ignored) {}
            }

            // 3) 연도 없는 M월 d일 → 올해로 가정
            java.util.regex.Matcher m3 = java.util.regex.Pattern
                    .compile("(?<!\\d)(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일")
                    .matcher(text);
            while (m3.find()) {
                try {
                    candidates.add(java.time.LocalDate.of(
                            currentYear,
                            Integer.parseInt(m3.group(1)),
                            Integer.parseInt(m3.group(2))));
                } catch (Exception ignored) {}
            }

            // 4) 연도 없는 M[./]d → 올해로 가정 (단, yyyy 매칭 안 된 경우만)
            if (candidates.isEmpty()) {
                java.util.regex.Matcher m4 = java.util.regex.Pattern
                        .compile("(?<!\\d)(\\d{1,2})\\s*[./]\\s*(\\d{1,2})(?!\\d)")
                        .matcher(text);
                while (m4.find()) {
                    try {
                        candidates.add(java.time.LocalDate.of(
                                currentYear,
                                Integer.parseInt(m4.group(1)),
                                Integer.parseInt(m4.group(2))));
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}

        if (candidates.isEmpty()) return null;
        // 가장 늦은 날짜 (보통 마감일)
        return java.util.Collections.max(candidates);
    }
}
