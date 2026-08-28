package com.studywebsite.service;

import com.studywebsite.model.ForumReply;
import com.studywebsite.repository.ForumReplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ForumReplyService {
    private final ForumReplyRepository forumReplyRepository;

    public ForumReply create(ForumReply reply) {
        return forumReplyRepository.save(reply);
    }

    public ForumReply getById(Long id) {
        return forumReplyRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<ForumReply> getAll() {
        return forumReplyRepository.findAll();
    }

    public void delete(Long id) {
        forumReplyRepository.deleteById(id);
    }

    public List<ForumReply> findByAuthorId(Long authorId) {
        return forumReplyRepository.findByAuthor_Id(authorId);
    }

    public List<ForumReply> searchByContent(String contentPart) {
        return forumReplyRepository.findByContentContainingIgnoreCase(contentPart);
    }
}

