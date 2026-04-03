package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "crawlingThreadPool")
    public Executor crawlingThreadPool() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        // Gemini API 동시성 제어를 위해 풀 사이즈를 너무 크게 잡지 않음
        executor.setMaxPoolSize(3); 
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("CrawlPool-");
        executor.initialize();
        return executor;
    }
}
