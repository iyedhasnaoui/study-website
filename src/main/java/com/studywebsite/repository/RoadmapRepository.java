package com.studywebsite.repository;

import com.studywebsite.model.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

import java.util.Optional;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    List<Roadmap> findByAuthor_Id(Long authorId);
    List<Roadmap> findByTitleContainingIgnoreCase(String titlePart);

    @Query("SELECT DISTINCT r FROM Roadmap r LEFT JOIN FETCH r.tags LEFT JOIN FETCH r.author WHERE :isAdmin = true OR r.moderationStatus IS NULL OR r.moderationStatus = 'APPROVED' OR (:viewerId IS NOT NULL AND r.author.id = :viewerId)")
    List<Roadmap> findVisibleRoadmaps(@Param("viewerId") Long viewerId, @Param("isAdmin") boolean isAdmin);

    @Query("SELECT DISTINCT r FROM Roadmap r LEFT JOIN FETCH r.tags LEFT JOIN FETCH r.author WHERE r.id = :id")
    Optional<Roadmap> findByIdWithTags(@Param("id") Long id);
}

