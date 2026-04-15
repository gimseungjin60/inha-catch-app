package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    public static final String PROMPT_UNIFIED = 
        "[역할 부여]\n" +
        "너는 인하공전 학생들을 위한 '인하캐치' 서비스의 데이터 관리자야. 크롤링된 공고문을 분석하여 신규 등록, 기존 데이터 수정, 혹은 불필요한 정보 생략을 결정하고 정제하는 역할을 수행해.\n\n" +
        "[데이터 처리 및 필터링 규칙]\n" +
        "1. 날짜 필터링: 공고일 또는 시행 연도가 **2025년 이전(2024년 및 그 이전)**인 데이터는 분석하지 말고 **\"SKIP_OLD\"**라고만 응답해.\n" +
        "2. 중복 및 수정 판단:\n" +
        " - 만약 제공된 텍스트가 이전에 분석했던 내용과 동일하거나, 단순 공지(시험 일정 안내 등)라면 **\"SKIP_DUP\"**이라고 응답해.\n" +
        " - 기존 공고의 내용 중 '접수 기간 연장', '지원 자격 변경' 등 중요한 수정사항이 발견되면 기존 내용을 바탕으로 [수정사항 반영] 항목을 추가하여 재작성해.\n" +
        "3. 정보 생략: 인사말, 단순 절차 설명, 반복되는 유의사항 등 학생들에게 불필요한 사족은 모두 생략하고 '핵심 가치' 위주로만 남겨.\n\n" +
        "[응답 양식 (이 구조를 엄격히 따를 것)]\n" +
        "상태: (NEW / UPDATE / SKIP_OLD / SKIP_DUP 중 하나)\n" +
        "제목: \n" +
        "지원 대상: \n" +
        "신청 기간: \n" +
        "핵심 혜택: \n" +
        "변경 내용: \n" +
        "상세 요약: \n" +
        "태그: \n\n" +
        "[주의 사항]\n" +
        "- 2025년/2026년 최신 데이터가 아니면 절대 요약하지 마.\n" +
        "- 이미 알고 있는 뻔한 내용(예: 매달 반복되는 일반 공지)은 SKIP_DUP 처리해.\n" +
        "- 무료 API 한도를 아끼기 위해 불필요한 텍스트는 90% 이상 쳐내고 알맹이만 남겨.\n\n" +
        "분석할 공고문 텍스트:\n";

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
    }

    public String generateSummary(String promptTemplate, String content) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return "Gemini API 키가 설정되지 않았습니다.";
        }
        if (content == null || content.trim().isEmpty()) {
            return "요약할 내용이 없습니다.";
        }

        String truncatedContent = content.length() > 5000 ? content.substring(0, 5000) : content;
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String prompt = promptTemplate + "내용:\n" + truncatedContent;

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        
        Map<String, Object> contentMap = new HashMap<>();
        contentMap.put("parts", List.of(part));
        
        requestBody.put("contents", List.of(contentMap));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        int retries = 0;
        int maxRetries = 3;
        while (retries < maxRetries) {
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> contentResp = (Map<String, Object>) candidates.get(0).get("content");
                        List<Map<String, Object>> partsResp = (List<Map<String, Object>>) contentResp.get("parts");
                        if (partsResp != null && !partsResp.isEmpty()) {
                            return (String) partsResp.get(0).get("text");
                        }
                    }
                }
                break;
            } catch (Exception e) {
                String errMsg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                boolean isTransient = errMsg.contains("429") || errMsg.contains("exhausted")
                        || errMsg.contains("too many requests") || errMsg.contains("503")
                        || errMsg.contains("timeout") || errMsg.contains("timed out");

                if (isTransient && retries < maxRetries - 1) {
                    long waitSec = (retries + 1) * 30L;
                    log.warn("[Gemini API] 일시적 오류 감지. {}초 대기 후 재시도... (시도 {}/{})", waitSec, retries + 1, maxRetries);
                    try { Thread.sleep(waitSec * 1000); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return "[AI 요약 중단] 인터럽트 발생";
                    }
                    retries++;
                } else {
                    log.error("Gemini API 호출 실패 (시도 {}/{}): {}", retries + 1, maxRetries, e.getMessage());
                    return "[AI 요약 오류] " + (isTransient ? "API 일시적 오류" : e.getMessage());
                }
            }
        }

        return "[AI 요약 실패] 최대 재시도 횟수 초과";
    }
}
