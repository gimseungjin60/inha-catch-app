package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.security.JwtUtil;
import com.example.demo.security.PasswordPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final KakaoOAuthService kakaoOAuthService;
    private final KakaoAuthService kakaoAuthService;
    private final EmailService emailService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                          KakaoOAuthService kakaoOAuthService, KakaoAuthService kakaoAuthService,
                          EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.kakaoOAuthService = kakaoOAuthService;
        this.kakaoAuthService = kakaoAuthService;
        this.emailService = emailService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        // 입력값 검증
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
        }
        if (!EMAIL_PATTERN.matcher(user.getEmail().trim()).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "올바른 이메일 형식이 아닙니다."));
        }
        Optional<String> pwError = PasswordPolicy.validate(user.getPassword(), user.getEmail());
        if (pwError.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", pwError.get()));
        }
        if (user.getName() == null || user.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이름을 입력해주세요."));
        }

        if (userRepository.existsByEmail(user.getEmail().trim())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "이미 존재하는 이메일입니다."));
        }

        user.setEmail(user.getEmail().trim());
        user.setName(user.getName().trim());
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("USER"); // Role injection 방지: 항상 USER로 강제 설정

        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(savedUser.getEmail(), savedUser.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(savedUser.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("user", savedUser);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String password = loginData.get("password");

        if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일과 비밀번호를 입력해주세요."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // 비활성 계정 차단
            if (user.getIsActive() != null && !user.getIsActive()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "비활성화된 계정입니다. 관리자에게 문의해주세요."));
            }

            if (passwordEncoder.matches(password, user.getPassword())) {
                String accessToken = jwtUtil.generateAccessToken(email.trim(), user.getRole());
                String refreshToken = jwtUtil.generateRefreshToken(email.trim());

                Map<String, Object> response = new HashMap<>();
                response.put("token", accessToken);
                response.put("refreshToken", refreshToken);
                response.put("user", user);

                return ResponseEntity.ok(response);
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> refreshData) {
        String refreshToken = refreshData.get("refreshToken");
        if (refreshToken != null && !refreshToken.trim().isEmpty()
                && !jwtUtil.isBlacklisted(refreshToken)
                && jwtUtil.validateRefreshToken(refreshToken)) {
            String email = jwtUtil.getEmailFromToken(refreshToken);
            Optional<User> userOpt = userRepository.findByEmail(email);
            String role = userOpt.map(User::getRole).orElse("USER");
            String newAccessToken = jwtUtil.generateAccessToken(email, role);
            return ResponseEntity.ok(Map.of("token", newAccessToken));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "리프레시 토큰이 만료되었거나 유효하지 않습니다."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, String> body) {
        // Access Token 블랙리스트
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtUtil.blacklistToken(token);
        }
        // Refresh Token도 블랙리스트
        if (body != null && body.containsKey("refreshToken")) {
            String refreshToken = body.get("refreshToken");
            if (refreshToken != null && !refreshToken.trim().isEmpty()) {
                jwtUtil.blacklistToken(refreshToken);
            }
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃 성공"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            // 보안상 이메일 존재 여부를 노출하지 않음 — 아래 정상 케이스와 동일 메시지
            return ResponseEntity.ok(Map.of("message", "가입된 이메일이라면 임시 비밀번호가 발송됩니다. 메일함을 확인해주세요."));
        }

        // 임시 비밀번호 생성 — 영숫자 + 특수문자 12자 (SecureRandom)
        String tempPassword = PasswordPolicy.generateTempPassword(12);
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        // SMTP가 설정된 경우에만 실제 발송. 미설정 환경에서는 발송되지 않으므로 경고만 남긴다.
        // 보안상 임시 비밀번호는 응답/로그에 노출하지 않는다.
        if (emailService.isEnabled()) {
            boolean sent = emailService.sendTempPassword(user.getEmail(), tempPassword);
            log.info("[비밀번호 재설정] 임시 비밀번호 메일 발송 {}", sent ? "성공" : "실패");
        } else {
            log.warn("[비밀번호 재설정] SMTP 미설정 — 임시 비밀번호 메일을 발송하지 못했습니다. (SMTP 환경변수 설정 필요)");
        }

        // 계정 존재 여부를 노출하지 않기 위해 항상 동일한 메시지를 반환한다.
        return ResponseEntity.ok(Map.of("message", "가입된 이메일이라면 임시 비밀번호가 발송됩니다. 메일함을 확인해주세요."));
    }

    @PostMapping("/kakao")
    public ResponseEntity<?> kakaoLogin(@RequestBody Map<String, String> payload) {
        String code = payload.get("code");
        String redirectUri = payload.get("redirectUri");

        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "카카오 인가코드가 필요합니다."));
        }

        Map<String, Object> result = kakaoAuthService.loginWithKakao(code, redirectUri);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "카카오 로그인에 실패했습니다."));
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> payload,
            org.springframework.security.core.Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "로그인이 필요합니다."));
        }

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (currentPassword == null || currentPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "현재 비밀번호를 입력해주세요."));
        }

        String email = authentication.getName();
        Optional<String> pwError = PasswordPolicy.validate(newPassword, email);
        if (pwError.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", pwError.get()));
        }

        User user = userRepository.findByEmail(email).orElseThrow();

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "현재 비밀번호가 올바르지 않습니다."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
    }

    // ── 카카오 로그인 ──

    /**
     * [모바일 네이티브 SDK용] 앱에서 카카오 SDK로 발급받은 access_token을 검증하고 JWT 발급.
     * 요청 body: { "accessToken": "카카오 access_token" }
     */
    @PostMapping("/kakao/token")
    public ResponseEntity<?> kakaoTokenLogin(@RequestBody Map<String, String> payload) {
        String kakaoAccessToken = payload != null ? payload.get("accessToken") : null;
        if (kakaoAccessToken == null || kakaoAccessToken.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "카카오 accessToken이 필요합니다."));
        }

        try {
            Map<String, String> kakaoUser = kakaoOAuthService.getUserInfo(kakaoAccessToken);
            String kakaoId = kakaoUser.get("id");
            String email = kakaoUser.get("email");
            String nickname = kakaoUser.get("nickname");

            if (kakaoId == null || kakaoId.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "카카오 토큰 검증 실패"));
            }

            User user = findOrCreateKakaoUser(kakaoId, email, nickname);

            String accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getRole());
            String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("token", accessToken);
            response.put("refreshToken", refreshToken);
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("카카오 토큰 로그인 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "카카오 로그인 실패: " + e.getMessage()));
        }
    }

    private User findOrCreateKakaoUser(String kakaoId, String email, String nickname) {
        Optional<User> existing = userRepository.findByProviderAndProviderId("KAKAO", kakaoId);
        if (existing.isPresent()) return existing.get();

        if (email != null && !email.isEmpty()) {
            Optional<User> emailUser = userRepository.findByEmail(email);
            if (emailUser.isPresent()) {
                User u = emailUser.get();
                u.setProvider("KAKAO");
                u.setProviderId(kakaoId);
                return userRepository.save(u);
            }
        } else {
            email = "kakao_" + kakaoId + "@inhacatch.kr";
        }
        return createKakaoUser(kakaoId, email, nickname);
    }

    /**
     * 카카오 OAuth 인증 페이지로 리다이렉트
     * 프론트엔드에서 WebBrowser로 이 URL을 열면 카카오 로그인 페이지가 뜸
     */
    @GetMapping("/kakao/login")
    public ResponseEntity<?> kakaoLogin() {
        String kakaoAuthUrl = "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + kakaoOAuthService.getRestApiKey()
                + "&redirect_uri=" + URLEncoder.encode(kakaoOAuthService.getRedirectUri(), StandardCharsets.UTF_8)
                + "&response_type=code";

        return ResponseEntity.status(302)
                .header("Location", kakaoAuthUrl)
                .build();
    }

    /**
     * 카카오 OAuth 콜백: 인가 코드 → 토큰 교환 → 사용자 조회/생성 → 앱으로 리다이렉트
     */
    @GetMapping("/kakao/callback")
    public ResponseEntity<?> kakaoCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        // 사용자가 카카오 로그인을 취소한 경우
        if (error != null || code == null) {
            String errorRedirect = "inhacatch://kakao-callback?error="
                    + URLEncoder.encode("카카오 로그인이 취소되었습니다.", StandardCharsets.UTF_8);
            return ResponseEntity.status(302)
                    .header("Location", errorRedirect)
                    .build();
        }
        try {
            // 1. 인가 코드로 카카오 액세스 토큰 교환
            String kakaoAccessToken = kakaoOAuthService.getAccessToken(code);

            // 2. 카카오 사용자 정보 조회
            Map<String, String> kakaoUser = kakaoOAuthService.getUserInfo(kakaoAccessToken);
            String kakaoId = kakaoUser.get("id");
            String email = kakaoUser.get("email");
            String nickname = kakaoUser.get("nickname");

            // 3. 기존 카카오 연동 사용자 조회 또는 신규 생성
            Optional<User> existingUser = userRepository.findByProviderAndProviderId("KAKAO", kakaoId);
            User user;

            if (existingUser.isPresent()) {
                user = existingUser.get();
            } else {
                // 같은 이메일로 가입된 계정이 있는지 확인
                if (email != null && !email.isEmpty()) {
                    Optional<User> emailUser = userRepository.findByEmail(email);
                    if (emailUser.isPresent()) {
                        // 기존 이메일 계정에 카카오 연동
                        user = emailUser.get();
                        user.setProvider("KAKAO");
                        user.setProviderId(kakaoId);
                        userRepository.save(user);
                    } else {
                        user = createKakaoUser(kakaoId, email, nickname);
                    }
                } else {
                    // 이메일 없이 카카오 로그인 (이메일을 카카오ID 기반으로 생성)
                    String generatedEmail = "kakao_" + kakaoId + "@inhacatch.kr";
                    user = createKakaoUser(kakaoId, generatedEmail, nickname);
                }
            }

            // 4. JWT 토큰 발급
            String accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getRole());
            String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

            // 5. 앱 딥링크로 리다이렉트 (inhacatch://kakao-callback?token=...&...)
            String redirectUrl = "inhacatch://kakao-callback"
                    + "?token=" + URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
                    + "&refreshToken=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8)
                    + "&name=" + URLEncoder.encode(user.getName() != null ? user.getName() : "", StandardCharsets.UTF_8)
                    + "&email=" + URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8)
                    + "&major=" + URLEncoder.encode(user.getMajor() != null ? user.getMajor() : "", StandardCharsets.UTF_8)
                    + "&keywords=" + URLEncoder.encode(user.getKeywords() != null ? user.getKeywords() : "", StandardCharsets.UTF_8)
                    + "&role=" + URLEncoder.encode(user.getRole() != null ? user.getRole() : "USER", StandardCharsets.UTF_8);

            return ResponseEntity.status(302)
                    .header("Location", redirectUrl)
                    .build();

        } catch (Exception e) {
            log.error("카카오 로그인 실패: {}", e.getMessage());
            String errorRedirect = "inhacatch://kakao-callback?error="
                    + URLEncoder.encode("카카오 로그인에 실패했습니다.", StandardCharsets.UTF_8);
            return ResponseEntity.status(302)
                    .header("Location", errorRedirect)
                    .build();
        }
    }

    private User createKakaoUser(String kakaoId, String email, String nickname) {
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setName(nickname != null && !nickname.isEmpty() ? nickname : "카카오 사용자");
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setProvider("KAKAO");
        newUser.setProviderId(kakaoId);
        newUser.setRole("USER");
        return userRepository.save(newUser);
    }
}
