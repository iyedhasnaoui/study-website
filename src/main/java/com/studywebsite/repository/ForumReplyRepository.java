package com.studywebsite.repository;

import com.studywebsite.model.ForumReply;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ForumReplyRepository extends JpaRepository<ForumReply, Long> {
    List<ForumReply> findByAuthor_Id(Long authorId);
    List<ForumReply> findByContentContainingIgnoreCase(String contentPart);
}

