package com.example.demo;

import com.example.demo.entity.UserBookmark;
import com.example.demo.entity.User;
import com.example.demo.entity.Scholarship;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<UserBookmark, Long> {
    List<UserBookmark> findByUser(User user);
    Optional<UserBookmark> findByUserAndScholarship(User user, Scholarship scholarship);
}
