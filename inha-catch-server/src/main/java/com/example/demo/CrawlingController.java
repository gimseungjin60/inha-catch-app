package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crawl")
@PreAuthorize("hasRole('ADMIN')")
public class CrawlingController {

    private final CrawlService crawlService;
    private final ScholarshipRepository scholarshipRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public CrawlingController(CrawlService crawlService, ScholarshipRepository scholarshipRepository,
                              UserRepository userRepository, NotificationRepository notificationRepository) {
        this.crawlService = crawlService;
        this.scholarshipRepository = scholarshipRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/errors")
    public List<com.example.demo.entity.CrawlErrorLog> getRecentErrors() {
        return crawlService.getRecentErrors();
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        long totalScholarships = scholarshipRepository.count();
        long totalUsers = userRepository.count();
        long totalNotifications = notificationRepository.count();
        return ResponseEntity.ok(Map.of(
                "totalScholarships", totalScholarships,
                "totalUsers", totalUsers,
                "totalNotifications", totalNotifications
        ));
    }

    @PostMapping("/list")
    public List<ScholarshipDto> crawlList() throws Exception {
        return crawlService.crawlAll();
    }

    @PostMapping("/save-all")
    public String crawlAndSaveAll() throws Exception {
        return crawlService.crawlAndSaveAll();
    }

    @PostMapping("/save")
    public String crawlAndSave() throws Exception {
        return crawlService.crawlAndSaveIncremental();
    }

    @PostMapping("/backfill")
    public String backfillSummaries() {
        return crawlService.backfillSummaries();
    }

    @DeleteMapping("/clear")
    public String clearDatabase() {
        return crawlService.clearDatabase();
    }

    @DeleteMapping("/purge-outdated")
    public String purgeOutdated() {
        return crawlService.purgeOutdated();
    }

    // ── 외부 크롤링 (위비티/씽굿) ──

    @PostMapping("/external")
    public String crawlAllExternal() throws Exception {
        return crawlService.crawlAllExternal();
    }

    @PostMapping("/external/wevity")
    public String crawlWevity() throws Exception {
        return crawlService.crawlWevity();
    }

    @PostMapping("/external/thinkcontest")
    public String crawlThinkContest() throws Exception {
        return crawlService.crawlThinkContest();
    }

    /**
     * 저작권 정책(시나리오 A) 마이그레이션:
     * 지정한 소스의 본문(content)·요약(basic/detail)·관련링크(related_links)만 NULL 처리한다.
     * sources 파라미터가 없으면 아무것도 지우지 않고 400을 반환한다.
     * 예: DELETE /api/crawl/external/content?sources=wevity,thinkcontest
     */
    @DeleteMapping("/external/content")
    public ResponseEntity<?> clearExternalContent(@RequestParam(required = false) String sources) {
        if (sources == null || sources.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "정리할 소스를 sources 파라미터로 명시해주세요. 예: ?sources=wevity,thinkcontest"
            ));
        }
        List<String> sourceList = java.util.Arrays.stream(sources.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        if (sourceList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "유효한 소스명이 없습니다. 예: ?sources=wevity,thinkcontest"
            ));
        }
        int cleared = crawlService.clearExternalContent(sourceList);
        return ResponseEntity.ok(Map.of(
                "cleared", cleared,
                "sources", sourceList
        ));
    }
}
