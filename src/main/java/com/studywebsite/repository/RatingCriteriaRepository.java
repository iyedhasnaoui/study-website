package com.studywebsite.repository;

import com.studywebsite.model.RatingCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RatingCriteriaRepository extends JpaRepository<RatingCriteria, Long> {
    Optional<RatingCriteria> findByName(String name);
}

