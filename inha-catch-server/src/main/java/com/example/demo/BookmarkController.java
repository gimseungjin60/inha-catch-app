package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.entity.UserBookmark;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bookmarks")
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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));
        
        List<Scholarship> bookmarks = bookmarkRepository.findScholarshipsByUser(user);
        return ResponseEntity.ok(bookmarks);
    }

    @PostMapping("/{scholarshipId}")
    public ResponseEntity<?> toggleBookmark(@PathVariable Long scholarshipId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new java.util.NoSuchElementException("사용자를 찾을 수 없습니다."));
        Scholarship scholarship = scholarshipRepository.findById(scholarshipId)
                .orElseThrow(() -> new java.util.NoSuchElementException("해당 공고를 찾을 수 없습니다."));

        Optional<UserBookmark> existing = bookmarkRepository.findByUserAndScholarship(user, scholarship);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "북마크가 해제되었습니다.", "bookmarked", false));
        } else {
            UserBookmark bookmark = new UserBookmark();
            bookmark.setUser(user);
            bookmark.setScholarship(scholarship);
            bookmarkRepository.save(bookmark);
            return ResponseEntity.ok(Map.of("message", "북마크에 추가되었습니다.", "bookmarked", true));
        }
    }
}
