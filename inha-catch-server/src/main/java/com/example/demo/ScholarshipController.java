package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/scholarships")
@CrossOrigin(origins = "*") 
public class ScholarshipController {
    private final ScholarshipRepository repository;

    public ScholarshipController(ScholarshipRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Scholarship> getAll() {
        return repository.findAll();
    }
    
    // 테스트용 데이터 하나 넣는 기능 (포스트맨 없이 브라우저에서 실행 가능)
    @GetMapping("/test")
    public String addTest() {
        Scholarship test = new Scholarship(null, "인하공전 장학금", "scholarship", "AI가 요약한 장학금 정보입니다.", "D-7", true);
        repository.save(test);
        return "테스트 데이터 저장 완료!";
    }
}