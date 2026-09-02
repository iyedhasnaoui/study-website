package com.studywebsite.repository;

import com.studywebsite.model.ForumTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForumTopicRepository extends JpaRepository<ForumTopic, Long> {

    Optional<ForumTopic> findBySlug(String slug);

    Optional<ForumTopic> findByName(String name);

    boolean existsBySlug(String slug);

    boolean existsByName(String name);
}
