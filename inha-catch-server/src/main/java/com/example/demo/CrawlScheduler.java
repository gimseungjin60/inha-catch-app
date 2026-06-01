package com.example.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlScheduler {

    private final CrawlService crawlService;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicLong lastCrawlStartTime = new AtomicLong(0);

    // 크롤링 최대 실행 시간: 1시간 (이후 잠금 해제)
    private static final long CRAWL_TIMEOUT_MS = 3600000L;

    // 내부 크롤링: 매 1시간
    @Scheduled(fixedDelay = 3600000)
    public void autoCrawl() {
        // 타임아웃 기반 데드락 방지
        if (running.get()) {
            long elapsed = System.currentTimeMillis() - lastCrawlStartTime.get();
            if (elapsed > CRAWL_TIMEOUT_MS) {
                log.warn("크롤링 타임아웃 감지 ({}ms 경과). 잠금 해제합니다.", elapsed);
                running.set(false);
            } else {
                log.info("자동 크롤링 스킵: 이미 실행 중 ({}ms 경과)", elapsed);
                return;
            }
        }

        if (!running.compareAndSet(false, true)) {
            return;
        }

        lastCrawlStartTime.set(System.currentTimeMillis());
        try {
            log.info("자동 크롤링 시작 (내부)");
            String result = crawlService.crawlAndSaveIncremental();
            log.info(result);
            long duration = System.currentTimeMillis() - lastCrawlStartTime.get();
            log.info("자동 크롤링 완료 (내부, 소요시간: {}ms)", duration);
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
