package com.studywebsite.repository;

import com.studywebsite.model.ResourceRating;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRatingRepository extends JpaRepository<ResourceRating, Long> {
    List<ResourceRating> findByResource_Id(Long resourceId);
    List<ResourceRating> findByUser_Id(Long userId);
    List<ResourceRating> findByCriteria_Id(Long criteriaId);
}

