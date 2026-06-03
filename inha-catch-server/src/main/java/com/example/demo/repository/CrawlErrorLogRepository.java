package com.example.demo.repository;

import com.example.demo.entity.CrawlErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrawlErrorLogRepository extends JpaRepository<CrawlErrorLog, Long> {

    // 어드민 조회용: 최근 100건 (최신순)
    List<CrawlErrorLog> findTop100ByOrderByCreatedAtDesc();
}
