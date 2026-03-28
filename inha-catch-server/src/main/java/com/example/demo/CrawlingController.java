package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crawl")
@CrossOrigin(origins = "*")
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
}
