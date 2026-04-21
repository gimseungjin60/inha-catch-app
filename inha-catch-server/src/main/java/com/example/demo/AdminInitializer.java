package com.example.demo;

import com.example.demo.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.init.email:}")
    private String adminEmail;

    @Value("${admin.init.password:}")
    private String adminPassword;

    @Value("${admin.init.name:관리자}")
    private String adminName;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("[AdminInitializer] ADMIN_INIT_EMAIL / ADMIN_INIT_PASSWORD 미설정 — 초기 관리자 생성을 건너뜁니다.");
            return;
        }
        ensureAdmin(adminEmail.trim(), adminPassword, adminName);
    }

    private void ensureAdmin(String email, String password, String name) {
        if (userRepository.existsByEmail(email)) {
            log.info("[AdminInitializer] 어드민 계정이 이미 존재합니다: {}", email);
            return;
        }

        User admin = new User();
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setName(name);
        admin.setMajor("관리");
        admin.setRole("ADMIN");

        userRepository.save(admin);
        log.info("================================================");
        log.info("  어드민 계정이 생성되었습니다!");
        log.info("  이메일: {}", email);
        log.info("  ※ 첫 로그인 후 반드시 비밀번호를 변경하세요!");
        log.info("================================================");
    }
}
