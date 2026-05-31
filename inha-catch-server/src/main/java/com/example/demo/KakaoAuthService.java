package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.security.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class KakaoAuthService {

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RestTemplate restTemplate = new RestTemplate();

    public KakaoAuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * 카카오 인가코드 → 액세스 토큰 교환
     */
    private String getKakaoAccessToken(String code, String redirectUri) {
        String tokenUrl = "https://kauth.kakao.com/oauth/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", kakaoClientId);
        params.add("redirect_uri", redirectUri != null ? redirectUri : kakaoRedirectUri);
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (String) response.getBody().get("access_token");
            }
        } catch (Exception e) {
            log.error("카카오 토큰 교환 실패: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 카카오 액세스 토큰 → 사용자 정보 조회
     */
    private Map<String, Object> getKakaoUserInfo(String accessToken) {
        String userInfoUrl = "https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(userInfoUrl, HttpMethod.GET, request, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("카카오 사용자 정보 조회 실패: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 카카오 로그인 전체 흐름: 인가코드 → 토큰 → 유저 조회/생성 → JWT 반환
     */
    public Map<String, Object> loginWithKakao(String code, String redirectUri) {
        // 1. 인가코드로 카카오 액세스 토큰 획득
        String kakaoAccessToken = getKakaoAccessToken(code, redirectUri);
        if (kakaoAccessToken == null) {
            return null;
        }

        // 2. 카카오 사용자 정보 조회
        Map<String, Object> kakaoUser = getKakaoUserInfo(kakaoAccessToken);
        if (kakaoUser == null) {
            return null;
        }

        // 3. 사용자 정보 파싱
        String kakaoId = String.valueOf(kakaoUser.get("id"));
        Map<String, Object> kakaoAccount = (Map<String, Object>) kakaoUser.get("kakao_account");
        Map<String, Object> profile = kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : null;

        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;
        String nickname = profile != null ? (String) profile.get("nickname") : null;

        // 이메일이 없으면 카카오ID 기반으로 생성
        if (email == null || email.isBlank()) {
            email = "kakao_" + kakaoId + "@inhacatch.kr";
        }
        if (nickname == null || nickname.isBlank()) {
            nickname = "카카오유저";
        }

        // 4. 기존 사용자 조회 (카카오 provider + providerId 기준)
        Optional<User> existingUser = userRepository.findByProviderAndProviderId("KAKAO", kakaoId);

        User user;
        boolean isNewUser = false;

        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            // 같은 이메일로 가입된 일반 계정이 있는지 확인
            Optional<User> emailUser = userRepository.findByEmail(email);
            if (emailUser.isPresent()) {
                // 기존 계정에 카카오 연동
                user = emailUser.get();
                user.setProvider("KAKAO");
                user.setProviderId(kakaoId);
                userRepository.save(user);
            } else {
                // 신규 사용자 생성
                user = new User();
                user.setEmail(email);
                user.setName(nickname);
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                user.setProvider("KAKAO");
                user.setProviderId(kakaoId);
                user.setRole("USER");
                userRepository.save(user);
                isNewUser = true;
            }
        }

        // 5. JWT 토큰 발급
        String accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        Map<String, Object> result = new HashMap<>();
        result.put("token", accessToken);
        result.put("refreshToken", refreshToken);
        result.put("user", user);
        result.put("isNewUser", isNewUser);

        log.info("카카오 로그인 성공: {} ({})", user.getEmail(), isNewUser ? "신규" : "기존");
        return result;
    }
}
