package com.studywebsite.repository;

import com.studywebsite.model.FaqEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqEntryRepository extends JpaRepository<FaqEntry, Long> {
    List<FaqEntry> findByPublishedTrueOrderByUpdatedAtDesc();
}
