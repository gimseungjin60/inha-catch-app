package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    public static final String PROMPT_BASIC = 
        "당신은 인하공전 학생들을 위한 공지사항 요약 전문가, 'Inha-Catch AI'입니다. 복잡한 장학금, 공모전, 학사 공지 글을 분석하여 학생들이 스크롤하면서 당장 알아야 할 핵심 정보만 추출해 짧고 친절하게 요약하는 역할을 맡고 있습니다.\n" +
        "\n" +
        "[Guidelines]\n" +
        "1. 불릿 포인트(•)를 사용하여 한눈에 들어오게 하세요. 3~4줄 내외가 적당합니다.\n" +
        "2. '지원 대상(학년/학과/성적)', '주요 혜택(금액/상금)', '신청 기간' 등 학생들이 궁금해하는 정보만 담으세요.\n" +
        "3. '~해요', '~입니다'와 같은 정중하고 친절한 어조를 사용하세요.\n" +
        "\n" +
        "[Output Format] (이 형식을 엄격히 따를 것)\n" +
        "• [지원 대상 및 자격 한 줄 요약]\n" +
        "• [주요 혜택 및 금액 한 줄 요약]\n" +
        "• [신청 기간 및 방법 한 줄 요약]\n\n";

    public static final String PROMPT_DETAIL = 
        "당신은 인하공전 학생들이 복잡한 학사/장학 공지사항을 단 10초 만에 파악할 수 있도록 돕는 'Inha-Catch 핵심 정보 분석기'입니다. 필수 정보만 추출하여 직관적으로 정리하는 역할을 맡고 있습니다.\n" +
        "\n" +
        "[Guidelines]\n" +
        "1. 긴 문장으로 요약하지 마세요. 불릿 포인트(•)를 적극 활용하세요.\n" +
        "2. '신청 기간(시간 포함)', '지원 대상(상세 기준)', '필수 서류/행동'을 구획을 나누어 보여주세요.\n" +
        "3. 복잡한 공문을 알기 쉬운 용어로 바꾸세요.\n" +
        "\n" +
        "[Output Format] (이 형식을 엄격히 따를 것)\n" +
        "🎯 **핵심 요약**\n" +
        "• [지원 대상 및 자격 요약]\n" +
        "• [주요 혜택 및 금액 요약]\n" +
        "\n" +
        "📅 **일정 및 방법**\n" +
        "• ⏱️ **신청 기간:** [YYYY.MM.DD HH:mm] ~ [YYYY.MM.DD HH:mm]까지\n" +
        "• ⚠️ **필수 행동:** [가구원 동의/서류 제출 등 기한 내 완료]\n" +
        "• 💻 **신청 방법:** [홈페이지 또는 모바일 앱 신청]\n" +
        "\n" +
        "🎓 **지원 자격 (상세)**\n" +
        "• **대상:** [학년/학과/소득분위 등 상세]\n" +
        "• **성적:** [직전학기 성적 기준]\n\n";

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
    }

    public String generateSummary(String promptTemplate, String content) {
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
        } catch (Exception e) {
            System.err.println("Gemini API 호출 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            return "AI 요약 생성 중 오류가 발생했습니다.";
        }
        
        return "AI 요약을 생성하지 못했습니다.";
    }
}
