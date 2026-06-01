package com.example.demo;

import com.example.demo.entity.Scholarship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScholarshipRepository extends JpaRepository<Scholarship, Long> {

    Optional<Scholarship> findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(String sourceSite, String boardId);

    Optional<Scholarship> findBySourceSiteAndBoardIdAndArticleId(String sourceSite, String boardId, Long articleId);

    boolean existsBySourceSiteAndBoardIdAndArticleId(String sourceSite, String boardId, Long articleId);

    org.springframework.data.domain.Page<Scholarship> findByTitleContainingOrContentContainingOrBasicSummaryContainingOrDetailSummaryContaining(String title, String content, String basicSummary, String detailSummary, org.springframework.data.domain.Pageable pageable);

    /**
     * 탭(카테고리)별 조회. 기존 데이터에 category가 null인 경우가 많아,
     * 앱의 분류 휴리스틱과 동일하게 적용한다:
     *   JOB         = category='JOB'
     *   CONTEST     = category='CONTEST' 또는 (미분류 + 제목에 '공모전')
     *   SCHOLARSHIP = category='SCHOLARSHIP' 또는 (미분류 + 제목에 '공모전' 없음)  ← 기본 버킷
     */
    @Query("SELECT s FROM Scholarship s WHERE " +
            "(:cat = 'JOB' AND s.category = 'JOB') OR " +
            "(:cat = 'CONTEST' AND (s.category = 'CONTEST' OR " +
            "  ((s.category IS NULL OR s.category NOT IN ('JOB','CONTEST','SCHOLARSHIP')) AND s.title LIKE '%공모전%'))) OR " +
            "(:cat = 'SCHOLARSHIP' AND (s.category = 'SCHOLARSHIP' OR " +
            "  ((s.category IS NULL OR s.category NOT IN ('JOB','CONTEST','SCHOLARSHIP')) AND (s.title IS NULL OR s.title NOT LIKE '%공모전%'))))")
    org.springframework.data.domain.Page<Scholarship> findByEffectiveCategory(@org.springframework.data.repository.query.Param("cat") String cat, org.springframework.data.domain.Pageable pageable);

    long countByCrawledAtAfter(LocalDateTime dateTime);

    @Query("SELECT s.category, COUNT(s) FROM Scholarship s GROUP BY s.category")
    List<Object[]> countByCategoryGrouped();
}
