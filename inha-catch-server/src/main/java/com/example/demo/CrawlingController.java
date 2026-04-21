package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crawl")
public class CrawlingController {

    private final CrawlService crawlService;

    public CrawlingController(CrawlService crawlService) {
        this.crawlService = crawlService;
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

    @GetMapping("/purge-outdated")
    public String purgeOutdated() {
        return crawlService.purgeOutdated();
    }

    // ── 외부 크롤링 ──

    @GetMapping("/external")
    public String crawlAllExternal() throws Exception {
        return crawlService.crawlAllExternal();
    }

    @GetMapping("/external/wevity")
    public String crawlWevity() throws Exception {
        return crawlService.crawlWevity();
    }

    @GetMapping("/external/thinkcontest")
    public String crawlThinkContest() throws Exception {
        return crawlService.crawlThinkContest();
    }
}
