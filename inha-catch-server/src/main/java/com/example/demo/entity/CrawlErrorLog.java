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
}
