package com.studywebsite.repository;

import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {

    List<RoadmapNode> findByRoadmap_IdOrderByIdAsc(Long roadmapId);

    Optional<RoadmapNode> findFirstByRoadmap_IdAndNodeTypeOrderByIdAsc(Long roadmapId, RoadmapNodeType nodeType);

    void deleteByRoadmap_Id(Long roadmapId);

    @Modifying
    @Query("update RoadmapNode n set n.linkedRoadmapId = null where n.linkedRoadmapId = :roadmapId")
    void clearLinksTo(@Param("roadmapId") Long roadmapId);
}
