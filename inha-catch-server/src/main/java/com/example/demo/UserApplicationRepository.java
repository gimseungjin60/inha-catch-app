package com.example.demo;

import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.Scholarship;
import com.example.demo.entity.User;
import com.example.demo.entity.UserApplication;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface UserApplicationRepository extends JpaRepository<UserApplication, Long> {

    Optional<UserApplication> findByUserAndScholarship(User user, Scholarship scholarship);

    @EntityGraph(attributePaths = "scholarship")
    List<UserApplication> findByUserOrderByUpdatedAtDesc(User user);

    @EntityGraph(attributePaths = "scholarship")
    List<UserApplication> findByUserAndStatusOrderByUpdatedAtDesc(User user, ApplicationStatus status);

    long countByUserAndStatus(User user, ApplicationStatus status);

    @Query("SELECT ua.status AS status, COUNT(ua) AS cnt FROM UserApplication ua WHERE ua.user = :user GROUP BY ua.status")
    List<Object[]> countGroupedByStatus(@Param("user") User user);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserApplication ua WHERE ua.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
