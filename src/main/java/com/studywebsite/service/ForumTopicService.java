package com.studywebsite.service;

import com.studywebsite.model.ForumTopic;
import com.studywebsite.repository.ForumTopicRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ForumTopicService {

    private final ForumTopicRepository forumTopicRepository;

    public List<ForumTopic> getAllTopics() {
        return forumTopicRepository.findAll();
    }

    public ForumTopic getById(Long id) {
        return forumTopicRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ForumTopic not found with id: " + id));
    }

    public ForumTopic getBySlug(String slug) {
        return forumTopicRepository.findBySlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("ForumTopic not found with slug: " + slug));
    }

    @Transactional
    public ForumTopic createTopic(ForumTopic topic) {
        if (forumTopicRepository.existsBySlug(topic.getSlug())) {
            throw new IllegalArgumentException("Topic with slug '" + topic.getSlug() + "' already exists");
        }
        if (forumTopicRepository.existsByName(topic.getName())) {
            throw new IllegalArgumentException("Topic with name '" + topic.getName() + "' already exists");
        }
        return forumTopicRepository.save(topic);
    }

    @Transactional
    public ForumTopic updateTopic(Long id, ForumTopic updatedTopic) {
        ForumTopic existing = getById(id);

        if (!existing.getSlug().equals(updatedTopic.getSlug()) && forumTopicRepository.existsBySlug(updatedTopic.getSlug())) {
            throw new IllegalArgumentException("Topic with slug '" + updatedTopic.getSlug() + "' already exists");
        }
        if (!existing.getName().equals(updatedTopic.getName()) && forumTopicRepository.existsByName(updatedTopic.getName())) {
            throw new IllegalArgumentException("Topic with name '" + updatedTopic.getName() + "' already exists");
        }

        existing.setName(updatedTopic.getName());
        existing.setSlug(updatedTopic.getSlug());
        existing.setIcon(updatedTopic.getIcon());
        existing.setDescription(updatedTopic.getDescription());

        return forumTopicRepository.save(existing);
    }

    @Transactional
    public void deleteTopic(Long id) {
        if (!forumTopicRepository.existsById(id)) {
            throw new EntityNotFoundException("ForumTopic not found with id: " + id);
        }
        // Foreign key ON DELETE SET NULL on forum_posts ensures referencing posts become topic = NULL automatically
        forumTopicRepository.deleteById(id);
    }
}