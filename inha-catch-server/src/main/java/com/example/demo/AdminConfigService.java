package com.example.demo;

import com.example.demo.entity.AdminConfig;
import com.example.demo.repository.AdminConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 어드민 설정 KV 저장소 서비스.
 * - JSON 직렬화/역직렬화
 * - 기본값(default) 자동 시드 (@PostConstruct)
 * - 캐시 없이 매번 DB 조회 (운영 빈도 낮아 OK)
 */
@Slf4j
@Service
public class AdminConfigService {

    public static final String KEY_ALGORITHM_WEIGHTS = "algorithm.weights";
    public static final String KEY_SETTINGS_GENERAL = "settings.general";
    public static final String KEY_SETTINGS_CRAWL = "settings.crawl";

    private final AdminConfigRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AdminConfigService(AdminConfigRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void seedDefaults() {
        if (!repository.existsById(KEY_ALGORITHM_WEIGHTS)) {
            put(KEY_ALGORITHM_WEIGHTS, defaultWeights());
            log.info("AdminConfig seeded: {}", KEY_ALGORITHM_WEIGHTS);
        }
        if (!repository.existsById(KEY_SETTINGS_GENERAL)) {
            put(KEY_SETTINGS_GENERAL, defaultGeneral());
            log.info("AdminConfig seeded: {}", KEY_SETTINGS_GENERAL);
        }
        if (!repository.existsById(KEY_SETTINGS_CRAWL)) {
            put(KEY_SETTINGS_CRAWL, defaultCrawl());
            log.info("AdminConfig seeded: {}", KEY_SETTINGS_CRAWL);
        }
    }

    public <T> Optional<T> get(String key, TypeReference<T> typeRef) {
        return repository.findById(key).map(c -> {
            try {
                return objectMapper.readValue(c.getValue(), typeRef);
            } catch (Exception e) {
                log.error("AdminConfig 파싱 실패 key={}", key, e);
                return null;
            }
        });
    }

    public <T> Optional<T> get(String key, Class<T> clazz) {
        return repository.findById(key).map(c -> {
            try {
                return objectMapper.readValue(c.getValue(), clazz);
            } catch (Exception e) {
                log.error("AdminConfig 파싱 실패 key={}", key, e);
                return null;
            }
        });
    }

    public void put(String key, Object value) {
        try {
            String json = objectMapper.writeValueAsString(value);
            AdminConfig existing = repository.findById(key).orElse(null);
            if (existing == null) {
                repository.save(new AdminConfig(key, json));
            } else {
                existing.setValue(json);
                repository.save(existing);
            }
        } catch (Exception e) {
            throw new RuntimeException("AdminConfig 저장 실패: " + key, e);
        }
    }

    // ── 기본값 ─────────────────────────────────────────────

    private List<Map<String, Object>> defaultWeights() {
        return List.of(
                weightItem("major", "전공 일치도", 0.40, "사용자 학과와 공고 대상 학과의 일치"),
                weightItem("keyword", "키워드 일치도", 0.25, "사용자 관심 키워드와 본문 매칭"),
                weightItem("urgency", "마감 임박도", 0.15, "D-day가 가까울수록 가중치 ↑"),
                weightItem("recency", "신규성", 0.10, "최근 등록된 공고 우대"),
                weightItem("activity", "사용자 활동 점수", 0.10, "북마크/조회 패턴 기반 개인화")
        );
    }

    private Map<String, Object> weightItem(String key, String label, double value, String desc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("value", value);
        m.put("desc", desc);
        return m;
    }

    private Map<String, Object> defaultGeneral() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("serviceName", "Inha-Catch");
        m.put("adminEmail", "admin@inhatc.ac.kr");
        m.put("timezone", "Asia/Seoul");
        m.put("language", "ko");
        return m;
    }

    private Map<String, Object> defaultCrawl() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("intervalMinutes", 60);
        m.put("nightStop", true);
        m.put("autoRetry", true);
        return m;
    }
}
