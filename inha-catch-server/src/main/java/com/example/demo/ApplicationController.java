package com.example.demo;

import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.entity.UserApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final UserApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final ScholarshipRepository scholarshipRepository;

    public ApplicationController(UserApplicationRepository applicationRepository,
                                 UserRepository userRepository,
                                 ScholarshipRepository scholarshipRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.scholarshipRepository = scholarshipRepository;
    }

    @GetMapping
    public ResponseEntity<?> getMyApplications(@RequestParam(required = false) String status,
                                               Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();

        List<UserApplication> apps;
        if (status != null && !status.isBlank()) {
            ApplicationStatus s;
            try {
                s = ApplicationStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 상태값입니다."));
            }
            apps = applicationRepository.findByUserAndStatusOrderByUpdatedAtDesc(user, s);
        } else {
            apps = applicationRepository.findByUserOrderByUpdatedAtDesc(user);
        }

        return ResponseEntity.ok(apps.stream().map(this::toDto).toList());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (ApplicationStatus s : ApplicationStatus.values()) {
            counts.put(s.name(), 0L);
        }
        for (Object[] row : applicationRepository.countGroupedByStatus(user)) {
            counts.put(((ApplicationStatus) row[0]).name(), (Long) row[1]);
        }
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/{scholarshipId}")
    public ResponseEntity<?> getByScholarship(@PathVariable Long scholarshipId,
                                              Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Scholarship scholarship = scholarshipRepository.findById(scholarshipId)
                .orElseThrow(() -> new NoSuchElementException("해당 공고를 찾을 수 없습니다."));
        return applicationRepository.findByUserAndScholarship(user, scholarship)
                .<ResponseEntity<?>>map(ua -> ResponseEntity.ok(toDto(ua)))
                .orElseGet(() -> ResponseEntity.ok(Map.of("status", (Object) null)));
    }

    @PostMapping("/{scholarshipId}")
    public ResponseEntity<?> upsert(@PathVariable Long scholarshipId,
                                    @RequestBody Map<String, String> body,
                                    Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Scholarship scholarship = scholarshipRepository.findById(scholarshipId)
                .orElseThrow(() -> new NoSuchElementException("해당 공고를 찾을 수 없습니다."));

        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "status는 필수입니다."));
        }
        ApplicationStatus newStatus;
        try {
            newStatus = ApplicationStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 상태값입니다."));
        }

        UserApplication app = applicationRepository.findByUserAndScholarship(user, scholarship)
                .orElseGet(() -> {
                    UserApplication ua = new UserApplication();
                    ua.setUser(user);
                    ua.setScholarship(scholarship);
                    return ua;
                });

        ApplicationStatus prev = app.getStatus();
        app.setStatus(newStatus);

        if (body.containsKey("memo")) {
            String memo = body.get("memo");
            app.setMemo(memo != null && memo.length() > 1000 ? memo.substring(0, 1000) : memo);
        }

        LocalDateTime now = LocalDateTime.now();
        if (newStatus == ApplicationStatus.APPLIED && prev != ApplicationStatus.APPLIED) {
            app.setAppliedAt(now);
        }
        if ((newStatus == ApplicationStatus.ACCEPTED || newStatus == ApplicationStatus.REJECTED)
                && prev != newStatus) {
            app.setResultAt(now);
        }

        applicationRepository.save(app);
        return ResponseEntity.ok(toDto(app));
    }

    @DeleteMapping("/{scholarshipId}")
    public ResponseEntity<?> delete(@PathVariable Long scholarshipId,
                                    Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Scholarship scholarship = scholarshipRepository.findById(scholarshipId)
                .orElseThrow(() -> new NoSuchElementException("해당 공고를 찾을 수 없습니다."));

        applicationRepository.findByUserAndScholarship(user, scholarship)
                .ifPresent(applicationRepository::delete);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }

    private Map<String, Object> toDto(UserApplication ua) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", ua.getId());
        map.put("status", ua.getStatus().name());
        map.put("memo", ua.getMemo());
        map.put("appliedAt", ua.getAppliedAt());
        map.put("resultAt", ua.getResultAt());
        map.put("createdAt", ua.getCreatedAt());
        map.put("updatedAt", ua.getUpdatedAt());
        Scholarship s = ua.getScholarship();
        if (s != null) {
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("id", s.getId());
            sMap.put("title", s.getTitle());
            sMap.put("applyPeriod", s.getApplyPeriod());
            sMap.put("dDay", s.getDDay());
            sMap.put("boardId", s.getBoardId());
            map.put("scholarship", sMap);
        }
        return map;
    }
}
