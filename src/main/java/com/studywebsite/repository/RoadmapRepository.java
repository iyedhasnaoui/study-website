package com.studywebsite.repository;

import com.studywebsite.model.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    List<Roadmap> findByAuthor_Id(Long authorId);
    List<Roadmap> findByTitleContainingIgnoreCase(String titlePart);

    @Query("SELECT r FROM Roadmap r WHERE :isAdmin = true OR r.moderationStatus = 'APPROVED' OR (:viewerId IS NOT NULL AND r.author.id = :viewerId AND r.moderationStatus = 'PENDING')")
    List<Roadmap> findVisibleRoadmaps(@Param("viewerId") Long viewerId, @Param("isAdmin") boolean isAdmin);
}

