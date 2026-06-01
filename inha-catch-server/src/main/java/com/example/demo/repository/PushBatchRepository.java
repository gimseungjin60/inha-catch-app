package com.example.demo.repository;

import com.example.demo.entity.PushBatch;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PushBatchRepository extends JpaRepository<PushBatch, Long> {
    List<PushBatch> findAllByOrderBySentAtDesc(Pageable pageable);
}
