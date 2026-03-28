package com.example.demo;

import com.example.demo.entity.Scholarship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScholarshipRepository extends JpaRepository<Scholarship, Long> {

    Optional<Scholarship> findTopBySourceSiteAndBoardIdOrderByArticleIdDesc(String sourceSite, String boardId);

    Optional<Scholarship> findBySourceSiteAndBoardIdAndArticleId(String sourceSite, String boardId, Long articleId);

    boolean existsBySourceSiteAndBoardIdAndArticleId(String sourceSite, String boardId, Long articleId);

    org.springframework.data.domain.Page<Scholarship> findByTitleContainingOrContentContainingOrBasicSummaryContainingOrDetailSummaryContaining(String title, String content, String basicSummary, String detailSummary, org.springframework.data.domain.Pageable pageable);
}
