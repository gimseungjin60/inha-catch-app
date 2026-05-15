package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 어드민 설정 KV 저장소.
 * key:
 *  - "algorithm.weights"   → JSON array of {key,label,value,desc}
 *  - "settings.general"    → JSON object {serviceName,adminEmail,timezone,language}
 *  - "settings.crawl"      → JSON object {intervalMinutes,nightStop,autoRetry}
 */
@Entity
@Table(name = "admin_config")
@Getter
@Setter
@NoArgsConstructor
public class AdminConfig {

    @Id
    @Column(name = "config_key", length = 100)
    private String key;

    @Lob
    @Column(name = "value_json", columnDefinition = "LONGTEXT", nullable = false)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AdminConfig(String key, String value) {
        this.key = key;
        this.value = value;
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
