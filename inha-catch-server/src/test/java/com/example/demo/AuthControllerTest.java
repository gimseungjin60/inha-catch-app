package com.example.demo;

import com.example.demo.entity.User;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.security.JwtUtil;
import com.example.demo.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtUtil.class})
@TestPropertySource(properties = {
        "jwt.secret=SW5oYUNhdGNoU2VjcmV0S2V5Rm9ySldUQXV0aDIwMjZWZXJ5U2VjdXJlIQ=="
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    // ==================== 회원가입 테스트 ====================

    @Test
    @DisplayName("회원가입 성공")
    void signup_success() throws Exception {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });

        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "password", "pass1234",
                "name", "TestUser"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.user").exists());
    }

    @Test
    @DisplayName("중복 이메일로 회원가입 시 400 반환")
    void signup_duplicateEmail_returns400() throws Exception {
        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        Map<String, String> request = Map.of(
                "email", "dup@example.com",
                "password", "pass1234",
                "name", "TestUser"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("이미 존재하는 이메일입니다."));
    }

    @Test
    @DisplayName("이메일 형식 잘못된 경우 400 반환")
    void signup_invalidEmailFormat_returns400() throws Exception {
        Map<String, String> request = Map.of(
                "email", "not-an-email",
                "password", "pass1234",
                "name", "TestUser"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("올바른 이메일 형식이 아닙니다."));
    }

    @Test
    @DisplayName("비밀번호 4자 미만 400 반환")
    void signup_shortPassword_returns400() throws Exception {
        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "password", "abc",
                "name", "TestUser"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("비밀번호는 4자 이상이어야 합니다."));
    }

    // ==================== 로그인 테스트 ====================

    @Test
    @DisplayName("로그인 성공")
    void login_success() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
        user.setName("TestUser");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass1234", "encodedPassword")).thenReturn(true);

        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "password", "pass1234"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.user").exists());
    }

    @Test
    @DisplayName("잘못된 비밀번호로 로그인 시 401 반환")
    void login_wrongPassword_returns401() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
        user.setName("TestUser");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "encodedPassword")).thenReturn(false);

        Map<String, String> request = Map.of(
                "email", "test@example.com",
                "password", "wrongpass"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    @DisplayName("빈 이메일/비밀번호로 로그인 시 400 반환")
    void login_emptyCredentials_returns400() throws Exception {
        Map<String, String> request = Map.of(
                "email", "",
                "password", ""
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("이메일과 비밀번호를 입력해주세요."));
    }
}
