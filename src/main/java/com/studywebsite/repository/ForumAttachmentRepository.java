package com.studywebsite.repository;

import com.studywebsite.model.ForumAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForumAttachmentRepository extends JpaRepository<ForumAttachment, Long> {
    List<ForumAttachment> findByPost_IdOrderByCreatedAtAsc(Long postId);
    List<ForumAttachment> findByReply_IdOrderByCreatedAtAsc(Long replyId);
    List<ForumAttachment> findByPost_IdOrReply_Post_Id(Long postId, Long replyPostId);
}
