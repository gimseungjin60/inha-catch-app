package com.example.demo;

import com.example.demo.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String adminEmail = "admin@inhacatch.kr";

        if (userRepository.existsByEmail(adminEmail)) {
            log.info("[AdminInitializer] 어드민 계정이 이미 존재합니다: {}", adminEmail);
            return;
        }

        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode("admin1234"));
        admin.setName("관리자");
        admin.setMajor("관리");
        admin.setRole("ADMIN");

        userRepository.save(admin);
        log.info("================================================");
        log.info("  어드민 계정이 생성되었습니다!");
        log.info("  이메일: {}", adminEmail);
        log.info("  ※ 첫 로그인 후 반드시 비밀번호를 변경하세요!");
        log.info("================================================");
    }
}
