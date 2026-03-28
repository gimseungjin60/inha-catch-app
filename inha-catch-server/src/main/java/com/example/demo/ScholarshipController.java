package com.example.demo;

import com.example.demo.entity.Scholarship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scholarships")
@CrossOrigin(origins = "*")
public class ScholarshipController {

    private final ScholarshipRepository repository;

    public ScholarshipController(ScholarshipRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Page<Scholarship> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "articleId"));
        return repository.findAll(pageable);
    }

    @GetMapping("/search")
    public Page<Scholarship> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "articleId"));
        return repository.findByTitleContainingOrContentContainingOrBasicSummaryContainingOrDetailSummaryContaining(keyword, keyword, keyword, keyword, pageable);
    }
}
