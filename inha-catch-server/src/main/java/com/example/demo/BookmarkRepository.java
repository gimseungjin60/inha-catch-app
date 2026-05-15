package com.example.demo;

import com.example.demo.entity.UserBookmark;
import com.example.demo.entity.User;
import com.example.demo.entity.Scholarship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<UserBookmark, Long> {
    List<UserBookmark> findByUser(User user);
    Optional<UserBookmark> findByUserAndScholarship(User user, Scholarship scholarship);

    @Query("SELECT ub.scholarship FROM UserBookmark ub WHERE ub.user = :user")
    List<Scholarship> findScholarshipsByUser(@Param("user") User user);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserBookmark ub WHERE ub.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
