package com.example.demo;

import com.example.demo.entity.Scholarship;
import org.springframework.data.domain.Sort;
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
        return repository.findAll(Sort.by(Sort.Direction.DESC, "articleId"));
    }
}
