package com.studywebsite.repository;

import com.studywebsite.model.ForumPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    List<ForumPost> findByAuthor_Id(Long authorId);
    List<ForumPost> findByTitleContainingIgnoreCase(String titlePart);
}

