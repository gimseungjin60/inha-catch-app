package com.example.demo;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByFcmTokenIsNotNullAndIsActiveTrue();
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);
}
