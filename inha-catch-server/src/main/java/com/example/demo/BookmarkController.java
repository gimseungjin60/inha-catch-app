package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.entity.UserBookmark;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = "*")
public class BookmarkController {

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final ScholarshipRepository scholarshipRepository;

    public BookmarkController(BookmarkRepository bookmarkRepository, UserRepository userRepository, ScholarshipRepository scholarshipRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
        this.scholarshipRepository = scholarshipRepository;
    }

    @GetMapping
    public ResponseEntity<?> getMyBookmarks(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        
        List<Scholarship> bookmarks = bookmarkRepository.findByUser(user)
                .stream()
                .map(UserBookmark::getScholarship)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(bookmarks);
    }

    @PostMapping("/{scholarshipId}")
    public ResponseEntity<?> toggleBookmark(@PathVariable Long scholarshipId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        Scholarship scholarship = scholarshipRepository.findById(scholarshipId).orElseThrow();

        Optional<UserBookmark> existing = bookmarkRepository.findByUserAndScholarship(user, scholarship);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return ResponseEntity.ok().body("{\"message\": \"Bookmark removed\"}");
        } else {
            UserBookmark bookmark = new UserBookmark();
            bookmark.setUser(user);
            bookmark.setScholarship(scholarship);
            bookmarkRepository.save(bookmark);
            return ResponseEntity.ok().body("{\"message\": \"Bookmark added\"}");
        }
    }
}
