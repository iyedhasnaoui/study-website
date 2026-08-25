package com.studywebsite.repository;

import com.studywebsite.model.RoadmapNode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoadmapNodeRepository extends JpaRepository<RoadmapNode, Long> {
    List<RoadmapNode> findByRoadmap_Id(Long roadmapId);
    List<RoadmapNode> findByParentStep_Id(Long parentId);
}

