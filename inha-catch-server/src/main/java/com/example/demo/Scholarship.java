package com.example.demo;

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
    @Column(name = "summary", columnDefinition = "LONGTEXT")
    private String summary;

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

    @CreationTimestamp
    @Column(name = "crawled_at", nullable = false, updatable = false)
    private LocalDateTime crawledAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScholarshipAttachment> attachments = new ArrayList<>();
}
