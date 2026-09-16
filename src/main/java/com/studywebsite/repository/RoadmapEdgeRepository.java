package com.studywebsite.repository;

import com.studywebsite.model.RoadmapEdge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoadmapEdgeRepository extends JpaRepository<RoadmapEdge, Long> {

    List<RoadmapEdge> findByRoadmap_IdOrderByIdAsc(Long roadmapId);

    void deleteBySourceNode_IdOrTargetNode_Id(Long sourceNodeId, Long targetNodeId);

    void deleteByRoadmap_Id(Long roadmapId);
}
