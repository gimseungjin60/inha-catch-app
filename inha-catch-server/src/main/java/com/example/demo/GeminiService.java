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

    public static final String PROMPT_MARKDOWN =
        "[역할]\n" +
        "너는 공고문을 모바일 앱에서 읽기 좋은 **Markdown**으로 재구성하는 편집자다. 주어진 본문을 읽고 가독성 높은 구조로 바꿔라.\n\n" +
        "[규칙]\n" +
        "1. 원문에 없는 내용은 절대 추가하지 말 것. 요약/의역만 허용, 창작 금지.\n" +
        "2. 다음 Markdown 문법만 사용: `## 섹션 제목`, `**강조**`, `- 목록`, `> 인용(유의사항용)`.\n" +
        "3. 이미지 링크, 광고 문구, 메뉴/푸터/네비게이션/저작권 표기, `[IMAGES]` 섹션은 전부 제거.\n" +
        "4. 가능하면 다음 섹션 순서로 구성: `## 지원 대상` → `## 신청 방법` → `## 혜택/시상` → `## 접수 기간` → `## 제출 서류` → `## 문의`.\n" +
        "5. 원문에 해당 섹션이 없으면 그 섹션은 생략. 없는 내용을 만들어내지 마.\n" +
        "6. 각 문단 사이에 빈 줄 한 줄씩 넣어 가독성 확보.\n" +
        "7. 전체 분량은 원문의 30~60% 수준. 반복/군더더기 제거.\n" +
        "8. **절대 응답 앞뒤에 ```markdown ... ``` 코드블럭 감싸지 말고 Markdown 본문만 바로 출력**.\n" +
        "9. 본문이 너무 짧거나(200자 미만) 유의미한 정보가 없으면 `SKIP_SHORT`라고만 응답.\n\n" +
        "변환할 원문:\n";

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
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

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

    /**
     * 멀티턴 채팅 응답 생성.
     * systemPrompt: 공고 컨텍스트를 담은 지시문 (예: "다음 공고를 바탕으로 답변해...")
     * history: [{role:"user"|"model", text:"..."}] 형태. 빈 리스트 가능.
     * userQuestion: 이번에 받은 사용자 질문
     */
    public String generateChatResponse(String systemPrompt, List<Map<String, String>> history, String userQuestion) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return "AI 서비스가 설정되지 않았습니다.";
        }
        if (userQuestion == null || userQuestion.trim().isEmpty()) {
            return "질문 내용이 비어있습니다.";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        java.util.List<Map<String, Object>> contents = new java.util.ArrayList<>();

        // systemPrompt + 첫 사용자 입력을 하나의 "user" 메시지로 결합 (Gemini는 system role 미지원, 첫 user에 prepend)
        if (history == null || history.isEmpty()) {
            contents.add(makeContent("user", systemPrompt + "\n\n[학생 질문]\n" + userQuestion));
        } else {
            boolean first = true;
            for (Map<String, String> turn : history) {
                String role = "user".equalsIgnoreCase(turn.get("role")) ? "user" : "model";
                String text = turn.get("text");
                if (text == null || text.isBlank()) continue;
                if (first && "user".equals(role)) {
                    contents.add(makeContent("user", systemPrompt + "\n\n[학생 질문]\n" + text));
                    first = false;
                } else {
                    contents.add(makeContent(role, text));
                    first = false;
                }
            }
            contents.add(makeContent("user", userQuestion));
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", contents);

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", 512);
        generationConfig.put("temperature", 0.4);
        requestBody.put("generationConfig", generationConfig);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> contentResp = (Map<String, Object>) candidates.get(0).get("content");
                    if (contentResp != null) {
                        List<Map<String, Object>> partsResp = (List<Map<String, Object>>) contentResp.get("parts");
                        if (partsResp != null && !partsResp.isEmpty()) {
                            Object text = partsResp.get(0).get("text");
                            if (text != null) return text.toString();
                        }
                    }
                }
            }
            return "응답을 가져오지 못했습니다.";
        } catch (Exception e) {
            log.error("Gemini chat API 호출 실패: {}", e.getMessage());
            return "잠시 후 다시 시도해주세요.";
        }
    }

    private Map<String, Object> makeContent(String role, String text) {
        Map<String, Object> part = new HashMap<>();
        part.put("text", text);
        Map<String, Object> content = new HashMap<>();
        content.put("role", role);
        content.put("parts", List.of(part));
        return content;
    }
}
