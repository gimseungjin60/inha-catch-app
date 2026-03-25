package com.example.demo;

<<<<<<< HEAD
import org.springframework.web.bind.annotation.*;
=======
import com.example.demo.entity.Scholarship;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

>>>>>>> feature/B
import java.util.List;

@RestController
@RequestMapping("/api/scholarships")
<<<<<<< HEAD
@CrossOrigin(origins = "*") 
public class ScholarshipController {
=======
@CrossOrigin(origins = "*")
public class ScholarshipController {

>>>>>>> feature/B
    private final ScholarshipRepository repository;

    public ScholarshipController(ScholarshipRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Scholarship> getAll() {
<<<<<<< HEAD
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
=======
        return repository.findAll(Sort.by(Sort.Direction.DESC, "articleId"));
    }
}
>>>>>>> feature/B
