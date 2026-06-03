package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "crawl_error_log")
@Getter
@Setter
@NoArgsConstructor
public class CrawlErrorLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 크롤 소스에서 발생했는지 식별 (예: inhatc-scholarship, wevity, thinkcontest).
    // 파이프라인 catch 등 소스 미지정 기록과의 호환을 위해 nullable.
    @Column(name = "source", length = 50)
    private String source;

    @Column(name = "target_url", length = 2000, nullable = false)
    private String targetUrl;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public CrawlErrorLog(String targetUrl, String errorMessage) {
        this.targetUrl = targetUrl;
        this.errorMessage = errorMessage;
    }

    public CrawlErrorLog(String source, String targetUrl, String errorMessage) {
        this.source = source;
        this.targetUrl = targetUrl;
        this.errorMessage = errorMessage;
    }
}
