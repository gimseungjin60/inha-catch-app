package com.example.demo;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class CrawlScheduler {

    private static final Logger log = LoggerFactory.getLogger(CrawlScheduler.class);

    private final CrawlService crawlService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    // 내부 크롤링: 매 1시간
    @Scheduled(fixedDelay = 3600000)
    public void autoCrawl() {
        if (!running.compareAndSet(false, true)) {
            log.info("자동 크롤링 스킵: 이미 실행 중");
            return;
        }

        try {
            log.info("자동 크롤링 시작 (내부)");
            String result = crawlService.crawlAndSaveIncremental();
            log.info(result);
            log.info("자동 크롤링 완료 (내부)");
        } catch (Exception e) {
            log.error("자동 크롤링 실패 (내부)", e);
        } finally {
            running.set(false);
        }
    }

    // 외부 크롤링: 매 6시간
    @Scheduled(fixedDelay = 21600000)
    public void autoExternalCrawl() {
        if (!running.compareAndSet(false, true)) {
            log.info("외부 크롤링 스킵: 이미 실행 중");
            return;
        }

        try {
            log.info("자동 크롤링 시작 (외부: 위비티, 씽굿)");
            String result = crawlService.crawlAllExternal();
            log.info(result);
            log.info("자동 크롤링 완료 (외부)");
        } catch (Exception e) {
            log.error("자동 크롤링 실패 (외부)", e);
        } finally {
            running.set(false);
        }
    }
}
