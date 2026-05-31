-- ============================================
-- Inha-Catch DB Schema (참고용 - JPA가 자동 생성)
-- MySQL 8.0+
-- ============================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(255) NOT NULL,
    `major` VARCHAR(255),
    `grade` VARCHAR(255),
    `keywords` TEXT COMMENT '쉼표 구분 관심 키워드',
    `role` VARCHAR(20) DEFAULT 'USER' COMMENT 'USER, ADMIN',
    `provider` VARCHAR(255) COMMENT 'LOCAL, GOOGLE, KAKAO',
    `provider_id` VARCHAR(255) COMMENT '소셜 로그인 고유 ID',
    `fcm_token` VARCHAR(512) COMMENT 'Firebase Cloud Messaging 토큰',
    `is_active` BOOLEAN DEFAULT TRUE,
    `terms_agreed_at` DATETIME COMMENT '서비스 이용약관 동의 시점',
    `privacy_agreed_at` DATETIME COMMENT '개인정보 처리방침 동의 시점',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 기존 DB 업그레이드용 마이그레이션 (이미 user 테이블이 있는 경우)
-- ALTER TABLE `user` ADD COLUMN `terms_agreed_at` DATETIME NULL COMMENT '서비스 이용약관 동의 시점';
-- ALTER TABLE `user` ADD COLUMN `privacy_agreed_at` DATETIME NULL COMMENT '개인정보 처리방침 동의 시점';

-- 2. 장학금/공모전 공고 테이블
CREATE TABLE IF NOT EXISTS `scholarship_post` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `source_site` VARCHAR(50) NOT NULL COMMENT '크롤링 출처 (inhatc 등)',
    `board_id` VARCHAR(50) NOT NULL COMMENT '게시판 ID',
    `article_id` BIGINT NOT NULL COMMENT '원문 게시글 ID',
    `title` VARCHAR(1000) NOT NULL,
    `category` VARCHAR(30) COMMENT 'SCHOLARSHIP, CONTEST, NOTICE',
    `post_url` VARCHAR(2000) NOT NULL,
    `author` VARCHAR(500),
    `posted_at` DATE,
    `view_count` INT,
    `is_notice` BOOLEAN NOT NULL DEFAULT FALSE,
    `has_attachment` BOOLEAN NOT NULL DEFAULT FALSE,
    `content` LONGTEXT,
    `basic_summary` LONGTEXT COMMENT 'AI 3단 요약 (리스트용)',
    `detail_summary` LONGTEXT COMMENT 'AI 상세 마크다운 분석',
    `apply_period` LONGTEXT COMMENT '신청 기간 (정규식 D-Day 추출 대상)',
    `eligibility` LONGTEXT COMMENT '지원 자격',
    `amount_info` LONGTEXT COMMENT '장학금/지원금 정보',
    `company_name` VARCHAR(500) COMMENT '채용공고 — 기관명/회사명 (category=JOB)',
    `work_location` VARCHAR(500) COMMENT '채용공고 — 근무지역',
    `recruitment_count` VARCHAR(100) COMMENT '채용공고 — 모집인원',
    `employment_type` VARCHAR(100) COMMENT '채용공고 — 고용형태 (정규직/계약직/인턴)',
    `experience_level` VARCHAR(100) COMMENT '채용공고 — 경력구분 (신입/경력)',
    `related_links` LONGTEXT,
    `content_hash` VARCHAR(64) COMMENT 'SHA-256 중복 감지용',
    `crawled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_source_board_article` (`source_site`, `board_id`, `article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 첨부파일 테이블
CREATE TABLE IF NOT EXISTS `scholarship_attachment` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `post_id` BIGINT NOT NULL,
    `file_name` VARCHAR(1000) NOT NULL,
    `file_url` VARCHAR(3000) NOT NULL,
    FOREIGN KEY (`post_id`) REFERENCES `scholarship_post`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 북마크 (유저 ↔ 공고 N:M)
CREATE TABLE IF NOT EXISTS `user_bookmark` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `scholarship_id` BIGINT NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`scholarship_id`) REFERENCES `scholarship_post`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 알림 테이블
CREATE TABLE IF NOT EXISTS `notification` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `scholarship_id` BIGINT,
    `type` VARCHAR(30) NOT NULL COMMENT 'DEADLINE, NEW, RECOMMEND, SYSTEM',
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`scholarship_id`) REFERENCES `scholarship_post`(`id`) ON DELETE SET NULL,
    INDEX `idx_noti_user` (`user_id`),
    INDEX `idx_noti_unread` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 조회 이력 (추천 알고리즘 고도화용)
CREATE TABLE IF NOT EXISTS `user_view_log` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `scholarship_id` BIGINT NOT NULL,
    `action_type` VARCHAR(20) NOT NULL COMMENT 'VIEW, BOOKMARK, CLICK_LINK',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`scholarship_id`) REFERENCES `scholarship_post`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_view_user` (`user_id`),
    INDEX `idx_user_view_scholarship` (`scholarship_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 토큰 블랙리스트
CREATE TABLE IF NOT EXISTS `token_blacklist` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `token` VARCHAR(512) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 크롤링 에러 로그
CREATE TABLE IF NOT EXISTS `crawl_error_log` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `target_url` VARCHAR(2000) NOT NULL,
    `error_message` TEXT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. 어드민 KV 설정 저장소
--    key: algorithm.weights / settings.general / settings.crawl
CREATE TABLE IF NOT EXISTS `admin_config` (
    `config_key` VARCHAR(100) PRIMARY KEY,
    `value_json` LONGTEXT NOT NULL,
    `updated_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. 어드민 일괄 알림 발송 이력
CREATE TABLE IF NOT EXISTS `push_batch` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `segment` VARCHAR(100),
    `deep_link` VARCHAR(500),
    `recipients_count` INT NOT NULL DEFAULT 0,
    `delivered_count` INT NOT NULL DEFAULT 0,
    `open_rate` DOUBLE NOT NULL DEFAULT 0,
    `sent_at` DATETIME NOT NULL,
    INDEX `idx_push_batch_sent` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 기존 데이터 마이그레이션 (필요시 실행)
-- ============================================

-- 기존 사용자에 role 부여
-- UPDATE `user` SET role = 'USER' WHERE role IS NULL;

-- 장학금 카테고리 자동 분류
-- UPDATE `scholarship_post` SET category = 'CONTEST' WHERE title LIKE '%공모전%' AND category IS NULL;
-- UPDATE `scholarship_post` SET category = 'SCHOLARSHIP' WHERE category IS NULL;
