package com.example.demo;

import com.example.demo.entity.Scholarship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/scholarships")
public class ScholarshipController {

    private static final int MAX_PAGE_SIZE = 200;

    private final ScholarshipRepository repository;

    public ScholarshipController(ScholarshipRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Page<Scholarship> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > MAX_PAGE_SIZE) size = MAX_PAGE_SIZE;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "articleId"));
        return repository.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public Page<Scholarship> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Page.empty();
        }
        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > MAX_PAGE_SIZE) size = MAX_PAGE_SIZE;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "articleId"));
        return repository.findByTitleContainingOrContentContainingOrBasicSummaryContainingOrDetailSummaryContaining(keyword, keyword, keyword, keyword, pageable);
    }

    // ── 장학금 추천 API ──

    @GetMapping("/recommended")
    public ResponseEntity<List<RecommendedScholarshipDto>> getRecommended(
            @RequestParam(required = false, defaultValue = "") String major,
            @RequestParam(required = false, defaultValue = "") String keywords
    ) {
        List<String> keywordList = Arrays.stream(keywords.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        String majorTrimmed = major.trim();

        // 프로필 정보가 아예 없으면 추천 불가
        if (majorTrimmed.isEmpty() && keywordList.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        LocalDate today = LocalDate.now();
        // 최근 500건만 대상으로 추천 (OOM 방지)
        Pageable recommendPageable = PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "articleId"));
        List<Scholarship> all = repository.findAll(recommendPageable).getContent();

        List<RecommendedScholarshipDto> result = all.stream()
                .map(s -> {
                    ScoreResult sr = calculateScore(s, majorTrimmed, keywordList, today);
                    return new RecommendedScholarshipDto(s, sr.total(), sr.personal(), sr.reasons());
                })
                // 개인 관련성 점수가 최소 25점 이상이어야 추천
                .filter(dto -> dto.getPersonalScore() >= 25)
                .sorted(Comparator.comparingInt(RecommendedScholarshipDto::getTotalScore).reversed())
                .limit(15)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * 추천 점수 계산. 반환값: [totalScore, personalScore]
     *
     * ── 개인 관련성 (personalScore) ──
     *   학과 매칭 (eligibility/content)  → +30
     *   학과 매칭 (title/basicSummary)   → +20
     *   키워드 매칭 (eligibility)        → 키워드당 +25
     *   키워드 매칭 (title/summary/content) → 키워드당 +15
     *   ※ 같은 키워드의 중복 필드 매칭은 최고점 1회만 적용
     *
     * ── 긴급성 보너스 ──
     *   D-1~3   → +15
     *   D-4~7   → +10
     *   D-8~14  → +5
     *
     * ── 최신성 보너스 ──
     *   3일 이내 등록 → +8
     *   7일 이내 등록 → +4
     *
     * ── 인기도 보너스 ──
     *   조회수 상위 (>300) → +5
     *   조회수 중위 (>150) → +3
     */
    private ScoreResult calculateScore(Scholarship s, String major, List<String> keywords, LocalDate today) {
        int personalScore = 0;
        int bonusScore = 0;
        List<Reason> reasons = new ArrayList<>();

        String title = nullSafe(s.getTitle()).toLowerCase();
        String eligibility = nullSafe(s.getEligibility()).toLowerCase();
        String basicSummary = nullSafe(s.getBasicSummary()).toLowerCase();
        String detailSummary = nullSafe(s.getDetailSummary()).toLowerCase();
        String content = nullSafe(s.getContent()).toLowerCase();

        // ── 1. 학과 매칭 ──
        if (!major.isEmpty()) {
            String majorLower = major.toLowerCase();
            if (eligibility.contains(majorLower) || content.contains(majorLower)) {
                personalScore += 30;
                reasons.add(new Reason("MAJOR", "학과 일치 (" + major + ")", 30));
            } else if (title.contains(majorLower) || basicSummary.contains(majorLower)) {
                personalScore += 20;
                reasons.add(new Reason("MAJOR", "학과 관련 (" + major + ")", 20));
            }
        }

        // ── 2. 키워드 매칭 (사용자가 회원가입 시 입력한 키워드) ──
        for (String kw : keywords) {
            String kwLower = kw.toLowerCase();
            if (eligibility.contains(kwLower)) {
                personalScore += 25;
                reasons.add(new Reason("KEYWORD", "키워드 '" + kw + "' (자격)", 25));
            } else if (title.contains(kwLower) || basicSummary.contains(kwLower)
                    || detailSummary.contains(kwLower) || content.contains(kwLower)) {
                personalScore += 15;
                reasons.add(new Reason("KEYWORD", "키워드 '" + kw + "'", 15));
            }
        }

        // ── 3. 마감 긴급성 보너스 ──
        long dDay = parseDDay(s);
        if (dDay >= 0 && dDay <= 3) {
            bonusScore += 15;
            reasons.add(new Reason("DEADLINE", "마감 임박 (D-" + dDay + ")", 15));
        } else if (dDay >= 4 && dDay <= 7) {
            bonusScore += 10;
            reasons.add(new Reason("DEADLINE", "마감 임박 (D-" + dDay + ")", 10));
        } else if (dDay >= 8 && dDay <= 14) {
            bonusScore += 5;
            reasons.add(new Reason("DEADLINE", "곧 마감 (D-" + dDay + ")", 5));
        }
        // 이미 마감된 공고는 추천하지 않음
        if (dDay < 0 && dDay != -1) {
            return new ScoreResult(0, 0, java.util.Collections.emptyList());
        }

        // ── 4. 최신성 보너스 ──
        if (s.getPostedAt() != null) {
            long daysSincePosted = ChronoUnit.DAYS.between(s.getPostedAt(), today);
            if (daysSincePosted >= 0 && daysSincePosted <= 3) {
                bonusScore += 8;
                reasons.add(new Reason("FRESH", "최근 등록", 8));
            } else if (daysSincePosted >= 0 && daysSincePosted <= 7) {
                bonusScore += 4;
                reasons.add(new Reason("FRESH", "최근 등록", 4));
            }
        }

        // ── 5. 인기도 보너스 (보조 지표) ──
        int vc = s.getViewCount() != null ? s.getViewCount() : 0;
        if (vc > 300) {
            bonusScore += 5;
            reasons.add(new Reason("POPULAR", "인기 공고", 5));
        } else if (vc > 150) {
            bonusScore += 3;
            reasons.add(new Reason("POPULAR", "조회 많음", 3));
        }

        int total = personalScore + bonusScore;
        return new ScoreResult(total, personalScore, reasons);
    }

    /** applyPeriod에서 마감일까지 남은 일수. 파싱 실패 시 -1 반환. */
    private long parseDDay(Scholarship s) {
        LocalDate end = Scholarship.parseLatestDate(s.getApplyPeriod());
        return end == null ? -1 : ChronoUnit.DAYS.between(LocalDate.now(), end);
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    // ── 추천 결과 DTO ──

    public record Reason(String type, String label, int points) {}

    private record ScoreResult(int total, int personal, List<Reason> reasons) {}

    public static class RecommendedScholarshipDto {
        private final Scholarship scholarship;
        private final int score;
        private final int personalScore;
        private final List<Reason> reasons;

        public RecommendedScholarshipDto(Scholarship scholarship, int score, int personalScore, List<Reason> reasons) {
            this.scholarship = scholarship;
            this.score = score;
            this.personalScore = personalScore;
            this.reasons = reasons;
        }

        public Scholarship getScholarship() { return scholarship; }
        public int getScore() { return score; }
        public int getTotalScore() { return score; }
        public int getPersonalScore() { return personalScore; }
        public List<Reason> getReasons() { return reasons; }
    }
}
