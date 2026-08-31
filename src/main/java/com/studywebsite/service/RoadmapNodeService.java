package com.studywebsite.service;

import com.studywebsite.model.RoadmapNode;
import com.studywebsite.repository.RoadmapNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapNodeService {
    private final RoadmapNodeRepository roadmapNodeRepository;

    public RoadmapNode create(RoadmapNode node) {
        return roadmapNodeRepository.save(node);
    }

    public RoadmapNode getById(Long id) {
        return roadmapNodeRepository.findById(id).orElseThrow(() -> new RuntimeException("Roadmap node not found"));
    }

    public List<RoadmapNode> getAll() {
        return roadmapNodeRepository.findAll();
    }

    public void delete(Long id) {
        roadmapNodeRepository.deleteById(id);
    }

    public List<RoadmapNode> findByRoadmapId(Long roadmapId) {
        return roadmapNodeRepository.findByRoadmap_IdOrderByOrderIndexAscIdAsc(roadmapId);
    }

    public List<RoadmapNode> findByParentId(Long parentId) {
        return roadmapNodeRepository.findByParentStep_IdOrderByOrderIndexAscIdAsc(parentId);
    }
}