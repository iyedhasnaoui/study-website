package com.studywebsite.repository;

import com.studywebsite.model.Resource;
import com.studywebsite.model.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByType(ResourceType type);
    List<Resource> findByAuthor_Id(Long authorId);
}

