package com.studywebsite.repository;

import com.studywebsite.model.RoadmapNodeLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RoadmapNodeLinkRepository extends JpaRepository<RoadmapNodeLink, Long> {

    List<RoadmapNodeLink> findByNode_Roadmap_IdOrderBySortOrderAscIdAsc(Long roadmapId);

    List<RoadmapNodeLink> findByNode_IdOrderBySortOrderAscIdAsc(Long nodeId);

    List<RoadmapNodeLink> findByNode_IdIn(Collection<Long> nodeIds);
}
