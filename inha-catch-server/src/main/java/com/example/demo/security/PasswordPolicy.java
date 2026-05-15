package com.example.demo.security;

import java.security.SecureRandom;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 비밀번호 정책 일원화.
 * - 길이 8–64
 * - 영문 + 숫자 필수
 * - 흔한 약한 비밀번호 차단
 * - 이메일 prefix 와 동일한 비밀번호 차단
 * - 같은 문자/숫자 연속 4개 이상 차단 (aaaa, 1111)
 *
 * 사용: PasswordPolicy.validate(password, email).ifPresent(msg → 400 응답)
 */
public final class PasswordPolicy {

    private PasswordPolicy() {}

    private static final int MIN_LEN = 8;
    private static final int MAX_LEN = 64;

    private static final Pattern HAS_LETTER = Pattern.compile(".*[a-zA-Z].*");
    private static final Pattern HAS_DIGIT = Pattern.compile(".*[0-9].*");
    private static final Pattern REPEATED_4 = Pattern.compile("(.)\\1{3,}");

    // 자주 쓰이는 약한 비밀번호 (소문자 비교). 운영에서는 별도 사전 파일로 분리 가능.
    private static final Set<String> COMMON_WEAK = Set.of(
            "password", "password1", "password123", "12345678", "123456789", "1234567890",
            "qwerty", "qwerty123", "asdf1234", "abc12345", "abcd1234", "1q2w3e4r",
            "1q2w3e4r5t", "iloveyou", "admin123", "administrator", "letmein",
            "monkey123", "dragon123", "master123", "sunshine1", "princess1",
            "welcome1", "welcome123", "football1", "baseball1", "shadow123",
            "michael1", "jennifer1", "computer1", "starwars1", "trustno1",
            "passw0rd", "p@ssw0rd", "p@ssword", "qwer1234", "asdf1234",
            "zxcv1234", "qaz12345", "12qwaszx", "test1234", "test12345",
            "user1234", "user12345", "guest1234", "demo1234", "samsung1",
            "inha1234", "inhacatch", "inha12345", "school1234", "student1",
            "happy1234", "love1234"
    );

    /**
     * @return 위반 시 사용자에게 보일 메시지, 유효하면 Optional.empty()
     */
    public static Optional<String> validate(String password, String email) {
        if (password == null || password.isEmpty()) {
            return Optional.of("비밀번호를 입력해주세요.");
        }
        if (password.length() < MIN_LEN) {
            return Optional.of("비밀번호는 " + MIN_LEN + "자 이상이어야 해요.");
        }
        if (password.length() > MAX_LEN) {
            return Optional.of("비밀번호는 " + MAX_LEN + "자 이하여야 해요.");
        }
        if (password.contains(" ")) {
            return Optional.of("비밀번호에 공백은 사용할 수 없어요.");
        }
        if (!HAS_LETTER.matcher(password).matches()) {
            return Optional.of("비밀번호에 영문자가 포함되어야 해요.");
        }
        if (!HAS_DIGIT.matcher(password).matches()) {
            return Optional.of("비밀번호에 숫자가 포함되어야 해요.");
        }
        if (REPEATED_4.matcher(password).find()) {
            return Optional.of("같은 문자를 4번 이상 연속해서 사용할 수 없어요.");
        }

        String lower = password.toLowerCase();
        if (COMMON_WEAK.contains(lower)) {
            return Optional.of("너무 흔한 비밀번호예요. 다른 비밀번호를 사용해주세요.");
        }

        if (email != null && !email.isBlank()) {
            String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
            if (!local.isBlank() && lower.equals(local.toLowerCase())) {
                return Optional.of("이메일과 동일한 비밀번호는 사용할 수 없어요.");
            }
        }

        return Optional.empty();
    }

    /**
     * 충분히 강한 임시 비밀번호 생성 (영문 대소문자 + 숫자 + 특수문자).
     */
    private static final char[] TEMP_PASSWORD_CHARSET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateTempPassword(int length) {
        if (length < MIN_LEN) length = MIN_LEN;
        char[] out = new char[length];
        for (int i = 0; i < length; i++) {
            out[i] = TEMP_PASSWORD_CHARSET[RANDOM.nextInt(TEMP_PASSWORD_CHARSET.length)];
        }
        return new String(out);
    }
}
