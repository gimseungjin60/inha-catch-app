package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 어드민이 발송한 일괄 알림 이력.
 * 각 사용자별 개별 알림은 Notification 테이블에 별도 저장됨.
 */
@Entity
@Table(name = "push_batch")
@Getter
@Setter
@NoArgsConstructor
public class PushBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(length = 1000, nullable = false)
    private String body;

    @Column(length = 100)
    private String segment;

    @Column(name = "deep_link", length = 500)
    private String deepLink;

    @Column(name = "recipients_count", nullable = false)
    private int recipientsCount;

    @Column(name = "delivered_count", nullable = false)
    private int deliveredCount;

    /** 0–100 (%). 클릭 추적이 없으므로 우선 deliveredCount 기반. */
    @Column(name = "open_rate", nullable = false)
    private double openRate;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    public PushBatch(String title, String body, String segment, String deepLink,
                     int recipientsCount, int deliveredCount) {
        this.title = title;
        this.body = body;
        this.segment = segment;
        this.deepLink = deepLink;
        this.recipientsCount = recipientsCount;
        this.deliveredCount = deliveredCount;
        this.openRate = recipientsCount > 0
                ? Math.round((deliveredCount * 1000.0 / recipientsCount)) / 10.0
                : 0.0;
        this.sentAt = LocalDateTime.now();
    }
}
