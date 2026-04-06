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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
        LocalDate today = LocalDate.now();

        List<Scholarship> all = repository.findAll();

        List<RecommendedScholarshipDto> result = all.stream()
                .map(s -> {
                    int score = calculateScore(s, majorTrimmed, keywordList, today);
                    return new RecommendedScholarshipDto(s, score);
                })
                .filter(dto -> dto.getScore() > 0)
                .sorted(Comparator.comparingInt(RecommendedScholarshipDto::getScore).reversed())
                .limit(20)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private int calculateScore(Scholarship s, String major, List<String> keywords, LocalDate today) {
        int score = 0;
        String title = nullSafe(s.getTitle());
        String eligibility = nullSafe(s.getEligibility());
        String basicSummary = nullSafe(s.getBasicSummary());

        // 1. 학과 매칭 → +30점
        if (!major.isEmpty()) {
            if (title.contains(major) || eligibility.contains(major)) {
                score += 30;
            }
        }

        // 2. 키워드 매칭 → 키워드당 +20점
        for (String kw : keywords) {
            if (title.contains(kw) || eligibility.contains(kw) || basicSummary.contains(kw)) {
                score += 20;
            }
        }

        // 3. D-Day 가중치
        long dDay = parseDDay(s);
        if (dDay >= 1 && dDay <= 7) {
            score += 15;
        } else if (dDay >= 8 && dDay <= 14) {
            score += 10;
        } else if (dDay >= 15 && dDay <= 30) {
            score += 5;
        }

        // 4. 조회수 가중치
        int vc = s.getViewCount() != null ? s.getViewCount() : 0;
        if (vc > 200) {
            score += 10;
        } else if (vc > 100) {
            score += 5;
        }

        // 5. 최신성: 7일 이내 등록 → +10점
        if (s.getPostedAt() != null) {
            long daysSincePosted = ChronoUnit.DAYS.between(s.getPostedAt(), today);
            if (daysSincePosted >= 0 && daysSincePosted <= 7) {
                score += 10;
            }
        }

        return score;
    }

    /** applyPeriod에서 마감일까지 남은 일수를 파싱. 파싱 실패 시 -1 반환. */
    private long parseDDay(Scholarship s) {
        if (s.getApplyPeriod() == null || s.getApplyPeriod().trim().isEmpty()) {
            return -1;
        }
        try {
            Matcher m = Pattern.compile("(\\d{4})[./-](\\d{2})[./-](\\d{2})").matcher(s.getApplyPeriod());
            String lastDateStr = null;
            while (m.find()) {
                lastDateStr = m.group();
            }
            if (lastDateStr != null) {
                lastDateStr = lastDateStr.replaceAll("[./]", "-");
                LocalDate endDate = LocalDate.parse(lastDateStr);
                return ChronoUnit.DAYS.between(LocalDate.now(), endDate);
            }
        } catch (Exception e) {
            // ignore
        }
        return -1;
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    // ── 추천 결과 DTO ──

    public static class RecommendedScholarshipDto {
        private final Scholarship scholarship;
        private final int score;

        public RecommendedScholarshipDto(Scholarship scholarship, int score) {
            this.scholarship = scholarship;
            this.score = score;
        }

        public Scholarship getScholarship() { return scholarship; }
        public int getScore() { return score; }
    }
}
