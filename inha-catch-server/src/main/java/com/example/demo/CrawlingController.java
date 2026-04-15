package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crawl")
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

    @GetMapping("/list")
    public List<ScholarshipDto> crawlList() throws Exception {
        return crawlService.crawlAll();
    }

    @GetMapping("/save-all")
    public String crawlAndSaveAll() throws Exception {
        return crawlService.crawlAndSaveAll();
    }

    @GetMapping("/save")
    public String crawlAndSave() throws Exception {
        return crawlService.crawlAndSaveIncremental();
    }

    @GetMapping("/backfill")
    public String backfillSummaries() {
        return crawlService.backfillSummaries();
    }

    @GetMapping("/clear")
    public String clearDatabase() {
        return crawlService.clearDatabase();
    }
}
