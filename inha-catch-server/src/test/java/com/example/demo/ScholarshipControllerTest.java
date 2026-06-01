package com.example.demo;

import com.example.demo.entity.Scholarship;
import com.example.demo.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ScholarshipController.class)
@AutoConfigureMockMvc(addFilters = false) // 보안/레이트리밋 필터 비활성 — 컨트롤러 응답 자체를 검증
@Import(JwtUtil.class)                     // @WebMvcTest가 생성하는 JwtAuthenticationFilter 빈의 의존성
@TestPropertySource(properties = {
        "jwt.secret=SW5oYUNhdGNoU2VjcmV0S2V5Rm9ySldUQXV0aDIwMjZWZXJ5U2VjdXJlIQ=="
})
class ScholarshipControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ScholarshipRepository scholarshipRepository;

    // JwtUtil이 요구하는 협력 빈
    @MockitoBean
    private TokenBlacklistRepository tokenBlacklistRepository;

    private Scholarship createSampleScholarship(Long id, String title) {
        Scholarship s = new Scholarship();
        s.setId(id);
        s.setSourceSite("inha");
        s.setBoardId("scholarship");
        s.setArticleId(id);
        s.setTitle(title);
        s.setPostUrl("https://example.com/" + id);
        s.setAuthor("학생처");
        s.setPostedAt(LocalDate.of(2026, 4, 1));
        s.setViewCount(100);
        s.setNotice(false);
        s.setHasAttachment(false);
        s.setContent("장학금 내용");
        s.setBasicSummary("기본 요약");
        s.setDetailSummary("상세 요약");
        return s;
    }

    // ==================== 전체 조회 테스트 ====================

    @Test
    @DisplayName("GET /api/scholarships 정상 조회")
    void getAll_success() throws Exception {
        List<Scholarship> scholarships = List.of(
                createSampleScholarship(1L, "장학금 A"),
                createSampleScholarship(2L, "장학금 B")
        );
        Page<Scholarship> page = new PageImpl<>(scholarships);

        when(scholarshipRepository.findAll(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/scholarships")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].title").value("장학금 A"))
                .andExpect(jsonPath("$.content[1].title").value("장학금 B"));
    }

    // ==================== 단건 조회 테스트 ====================

    @Test
    @DisplayName("GET /api/scholarships/{id} 단건 조회 성공")
    void getById_success() throws Exception {
        Scholarship scholarship = createSampleScholarship(1L, "인하대 장학금");

        when(scholarshipRepository.findById(1L)).thenReturn(Optional.of(scholarship));

        mockMvc.perform(get("/api/scholarships/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("인하대 장학금"))
                .andExpect(jsonPath("$.sourceSite").value("inha"))
                .andExpect(jsonPath("$.author").value("학생처"));
    }

    @Test
    @DisplayName("GET /api/scholarships/{id} 없는 ID -> 404")
    void getById_notFound_returns404() throws Exception {
        when(scholarshipRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/scholarships/999"))
                .andExpect(status().isNotFound());
    }

    // ==================== 검색 테스트 ====================

    @Test
    @DisplayName("GET /api/scholarships/search 키워드 검색")
    void search_success() throws Exception {
        List<Scholarship> results = List.of(
                createSampleScholarship(1L, "성적우수 장학금")
        );
        Page<Scholarship> page = new PageImpl<>(results);

        when(scholarshipRepository
                .findByTitleContainingOrContentContainingOrBasicSummaryContainingOrDetailSummaryContaining(
                        eq("성적우수"), eq("성적우수"), eq("성적우수"), eq("성적우수"), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/scholarships/search")
                        .param("keyword", "성적우수")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("성적우수 장학금"));
    }

    // ==================== 페이지 크기 제한 테스트 ====================

    @Test
    @DisplayName("페이지 크기가 상한(2000) 초과 시 2000으로 제한")
    void getAll_pageSizeCappedAtMax() throws Exception {
        Page<Scholarship> emptyPage = new PageImpl<>(List.of());
        when(scholarshipRepository.findAll(any(Pageable.class))).thenReturn(emptyPage);

        mockMvc.perform(get("/api/scholarships")
                        .param("page", "0")
                        .param("size", "5000"))
                .andExpect(status().isOk());

        verify(scholarshipRepository).findAll(argThat((Pageable pageable) ->
                pageable.getPageSize() == 2000
        ));
    }
}
