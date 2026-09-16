package com.studywebsite.repository;

import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {

    List<RoadmapNode> findByRoadmap_IdOrderByIdAsc(Long roadmapId);

    Optional<RoadmapNode> findFirstByRoadmap_IdAndNodeTypeOrderByIdAsc(Long roadmapId, RoadmapNodeType nodeType);

    void deleteByRoadmap_Id(Long roadmapId);
}
