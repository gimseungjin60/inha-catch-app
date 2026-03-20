package com.example.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class CrawlScheduler {

    private final CrawlService crawlService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Scheduled(fixedDelay = 3600000)
    public void autoCrawl() {
        if (!running.compareAndSet(false, true)) {
            System.out.println("자동 크롤링 스킵: 이미 실행 중");
            return;
        }

        try {
            System.out.println("자동 크롤링 시작");
            String result = crawlService.crawlAndSaveIncremental();
            System.out.println(result);
            System.out.println("자동 크롤링 완료");
        } catch (Exception e) {
            System.out.println("자동 크롤링 실패");
            e.printStackTrace();
        } finally {
            running.set(false);
        }
    }
}
