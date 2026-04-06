package com.example.demo.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_view_log", indexes = {
        @Index(name = "idx_user_view_user", columnList = "user_id"),
        @Index(name = "idx_user_view_scholarship", columnList = "scholarship_id")
})
public class UserViewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scholarship_id", nullable = false)
    private Scholarship scholarship;

    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType; // VIEW, BOOKMARK, CLICK_LINK

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public UserViewLog() {}

    public UserViewLog(User user, Scholarship scholarship, String actionType) {
        this.user = user;
        this.scholarship = scholarship;
        this.actionType = actionType;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Scholarship getScholarship() { return scholarship; }
    public String getActionType() { return actionType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
