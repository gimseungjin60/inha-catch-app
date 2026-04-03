package com.example.demo.repository;

import com.example.demo.entity.CrawlErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrawlErrorLogRepository extends JpaRepository<CrawlErrorLog, Long> {
}
