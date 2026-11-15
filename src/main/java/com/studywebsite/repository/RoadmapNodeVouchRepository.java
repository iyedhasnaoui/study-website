package com.studywebsite.repository;

import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.RoadmapNodeVouch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RoadmapNodeVouchRepository extends JpaRepository<RoadmapNodeVouch, Long> {

    List<RoadmapNodeVouch> findByNode_Roadmap_IdOrderBySortOrderAscIdAsc(Long roadmapId);

    List<RoadmapNodeVouch> findByNode_IdOrderBySortOrderAscIdAsc(Long nodeId);

    List<RoadmapNodeVouch> findByNode_IdIn(Collection<Long> nodeIds);

    @Query("SELECT v FROM RoadmapNodeVouch v JOIN FETCH v.node n JOIN FETCH n.roadmap "
            + "LEFT JOIN FETCH v.proposedBy WHERE v.status = :status ORDER BY v.createdAt ASC, v.id ASC")
    List<RoadmapNodeVouch> findForReview(@Param("status") ModerationStatus status);
}
