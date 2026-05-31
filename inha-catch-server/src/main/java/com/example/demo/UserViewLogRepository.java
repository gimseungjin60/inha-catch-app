package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.entity.UserViewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserViewLogRepository extends JpaRepository<UserViewLog, Long> {

    @Query("SELECT v.scholarship.id, COUNT(v) as cnt FROM UserViewLog v WHERE v.user = :user GROUP BY v.scholarship.id ORDER BY cnt DESC")
    List<Object[]> findTopViewedByUser(User user);

    long countByUser(User user);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserViewLog v WHERE v.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
