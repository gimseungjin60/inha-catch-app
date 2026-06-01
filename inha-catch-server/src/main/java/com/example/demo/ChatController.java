package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/scholarships")
public class ChatController {

    private static final int CHAT_LIMIT_PER_MIN = 5;
    private static final int MAX_HISTORY_TURNS = 10;
    private static final int MAX_QUESTION_LEN = 400;
    private static final int MAX_CONTEXT_LEN = 4000;

    private final ScholarshipRepository scholarshipRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;

    private final Map<Long, Deque<Instant>> userChatTimestamps = new ConcurrentHashMap<>();

    public ChatController(ScholarshipRepository scholarshipRepository,
                          UserRepository userRepository,
                          GeminiService geminiService) {
        this.scholarshipRepository = scholarshipRepository;
        this.userRepository = userRepository;
        this.geminiService = geminiService;
    }

    @PostMapping("/{id}/chat")
    public ResponseEntity<?> chat(@PathVariable Long id,
                                  @RequestBody Map<String, Object> body,
                                  Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();

        if (!acquireRateLimit(user.getId())) {
            return ResponseEntity.status(429)
                    .body(Map.of("message", "AI 질문은 분당 " + CHAT_LIMIT_PER_MIN + "회까지 가능합니다. 잠시 후 다시 시도해주세요."));
        }

        String question = body.get("question") == null ? "" : body.get("question").toString().trim();
        if (question.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "질문을 입력해주세요."));
        }
        if (question.length() > MAX_QUESTION_LEN) {
            question = question.substring(0, MAX_QUESTION_LEN);
        }

        Scholarship s = scholarshipRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("해당 공고를 찾을 수 없습니다."));

        List<Map<String, String>> history = sanitizeHistory(body.get("history"));

        String systemPrompt = buildSystemPrompt(s, user);
        String answer = geminiService.generateChatResponse(systemPrompt, history, question);

        Map<String, Object> resp = new HashMap<>();
        resp.put("answer", answer);
        resp.put("scholarshipId", id);
        return ResponseEntity.ok(resp);
    }

    private boolean acquireRateLimit(Long userId) {
        Deque<Instant> dq = userChatTimestamps.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (dq) {
            Instant now = Instant.now();
            Instant cutoff = now.minus(Duration.ofMinutes(1));
            while (!dq.isEmpty() && dq.peekFirst().isBefore(cutoff)) {
                dq.pollFirst();
            }
            if (dq.size() >= CHAT_LIMIT_PER_MIN) return false;
            dq.addLast(now);
            return true;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> sanitizeHistory(Object raw) {
        List<Map<String, String>> result = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return result;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;
            Object role = map.get("role");
            Object text = map.get("text");
            if (role == null || text == null) continue;
            String r = role.toString();
            if (!"user".equalsIgnoreCase(r) && !"model".equalsIgnoreCase(r)) continue;
            String t = text.toString().trim();
            if (t.isEmpty()) continue;
            if (t.length() > MAX_QUESTION_LEN) t = t.substring(0, MAX_QUESTION_LEN);
            Map<String, String> turn = new HashMap<>();
            turn.put("role", r.toLowerCase());
            turn.put("text", t);
            result.add(turn);
        }
        if (result.size() > MAX_HISTORY_TURNS) {
            result = result.subList(result.size() - MAX_HISTORY_TURNS, result.size());
        }
        return result;
    }

    private String buildSystemPrompt(Scholarship s, User user) {
        StringBuilder sb = new StringBuilder();
        sb.append("너는 인하공전 학생을 돕는 장학금·공모전 어시스턴트야. ");
        sb.append("아래에 제공되는 공고 정보만 근거로 한국어로 친절하고 간결하게 답해. ");
        sb.append("공고에 명시되지 않은 내용은 추측하지 말고 '공고에 명시되어 있지 않습니다'라고 답해. ");
        sb.append("학생 정보(학과/관심 키워드)가 있으면 자격 추정에 참고해.\n\n");

        sb.append("[학생 정보]\n");
        sb.append("- 학과: ").append(user.getMajor() == null ? "미설정" : user.getMajor()).append("\n");
        sb.append("- 관심 키워드: ").append(user.getKeywords() == null || user.getKeywords().isBlank() ? "없음" : user.getKeywords()).append("\n\n");

        sb.append("[공고 정보]\n");
        sb.append("- 제목: ").append(nz(s.getTitle())).append("\n");
        if (s.getApplyPeriod() != null) sb.append("- 신청 기간: ").append(s.getApplyPeriod()).append("\n");
        if (s.getEligibility() != null) sb.append("- 자격: ").append(s.getEligibility()).append("\n");
        if (s.getAmountInfo() != null) sb.append("- 지원 금액: ").append(s.getAmountInfo()).append("\n");
        if (s.getDetailSummary() != null && !s.getDetailSummary().isBlank()) {
            sb.append("- 상세 요약:\n").append(s.getDetailSummary()).append("\n");
        }
        if (s.getContent() != null && !s.getContent().isBlank()) {
            String c = s.getContent();
            if (c.length() > MAX_CONTEXT_LEN) c = c.substring(0, MAX_CONTEXT_LEN);
            sb.append("- 본문:\n").append(c).append("\n");
        }
        return sb.toString();
    }

    private String nz(String v) { return v == null ? "" : v; }
}
