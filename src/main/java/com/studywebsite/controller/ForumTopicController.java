package com.studywebsite.controller;

import com.studywebsite.model.ForumTopic;
import com.studywebsite.service.ForumTopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/forum/topics")
@RequiredArgsConstructor
public class ForumTopicController {

    private final ForumTopicService forumTopicService;

    @GetMapping
    public ResponseEntity<List<ForumTopic>> getAllTopics() {
        return ResponseEntity.ok(forumTopicService.getAllTopics());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ForumTopic> getTopicById(@PathVariable Long id) {
        return ResponseEntity.ok(forumTopicService.getById(id));
    }
    // TODO: add getTopicBySlug method ( don't forget to update forumApi.ts )
}