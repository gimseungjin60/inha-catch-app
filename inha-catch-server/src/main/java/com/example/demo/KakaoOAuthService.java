package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class KakaoOAuthService {

    private static final Logger log = LoggerFactory.getLogger(KakaoOAuthService.class);
    private static final String KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.rest-api-key}")
    private String restApiKey;

    @Value("${kakao.redirect-uri}")
    private String redirectUri;

    public String getRestApiKey() {
        return restApiKey;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    /**
     * 인가 코드로 카카오 액세스 토큰을 교환
     */
    public String getAccessToken(String authorizationCode) throws Exception {
        String body = "grant_type=authorization_code"
                + "&client_id=" + URLEncoder.encode(restApiKey, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&code=" + URLEncoder.encode(authorizationCode, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(KAKAO_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("카카오 토큰 교환 실패: {}", response.body());
            throw new RuntimeException("카카오 토큰 교환 실패");
        }

        JsonNode json = objectMapper.readTree(response.body());
        return json.get("access_token").asText();
    }

    /**
     * 카카오 액세스 토큰으로 사용자 정보 조회
     * 반환: { "id": "카카오ID", "email": "이메일", "nickname": "닉네임" }
     */
    public Map<String, String> getUserInfo(String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(KAKAO_USER_INFO_URL))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("카카오 사용자 정보 조회 실패: {}", response.body());
            throw new RuntimeException("카카오 사용자 정보 조회 실패");
        }

        JsonNode json = objectMapper.readTree(response.body());
        String kakaoId = json.get("id").asText();

        JsonNode kakaoAccount = json.get("kakao_account");
        String email = "";
        String nickname = "";

        if (kakaoAccount != null) {
            if (kakaoAccount.has("email")) {
                email = kakaoAccount.get("email").asText();
            }
            JsonNode profile = kakaoAccount.get("profile");
            if (profile != null && profile.has("nickname")) {
                nickname = profile.get("nickname").asText();
            }
        }

        return Map.of(
                "id", kakaoId,
                "email", email,
                "nickname", nickname
        );
    }
}
