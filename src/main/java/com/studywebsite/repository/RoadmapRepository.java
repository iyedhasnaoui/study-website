package com.studywebsite.repository;

import com.studywebsite.model.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    List<Roadmap> findByAuthor_Id(Long authorId);
    List<Roadmap> findByTitleContainingIgnoreCase(String titlePart);
}

