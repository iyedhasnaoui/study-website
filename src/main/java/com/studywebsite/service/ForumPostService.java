package com.studywebsite.service;

import com.studywebsite.model.ForumPost;
import com.studywebsite.repository.ForumPostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ForumPostService {
    private final ForumPostRepository forumPostRepository;

    public ForumPost create(ForumPost post) {
        return forumPostRepository.save(post);
    }

    public ForumPost getById(Long id) {
        return forumPostRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("ForumPost entity not found"));
    }

    public List<ForumPost> getAll() {
        return forumPostRepository.findAll();
    }

    public void delete(Long id) {
        if (!forumPostRepository.existsById(id)) {
            throw new EntityNotFoundException("ForumPost entity not found");
        }
        forumPostRepository.deleteById(id);
    }

    public List<ForumPost> findByAuthorId(Long authorId) {
        return forumPostRepository.findByAuthor_Id(authorId);
    }

    public List<ForumPost> searchByTitle(String titlePart) {
        return forumPostRepository.findByTitleContainingIgnoreCase(titlePart);
    }
}

