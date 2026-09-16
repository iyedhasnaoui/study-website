package com.studywebsite.service;

import com.studywebsite.model.Roadmap;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.service.roadmap.RoadmapAccessDeniedException;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapGraphService roadmapGraphService;

    @Transactional
    public Roadmap create(Roadmap roadmap) {
        Roadmap saved = roadmapRepository.save(roadmap);
        roadmapGraphService.createRootNode(saved);
        return saved;
    }

    public Roadmap save(Roadmap roadmap) {
        return roadmapRepository.save(roadmap);
    }

    public Roadmap getById(Long id) {
        return roadmapRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Roadmap entity not found"));
    }

    public List<Roadmap> getAll() {
        return roadmapRepository.findAll();
    }

    @Transactional
    public void delete(Long id) {
        if (!roadmapRepository.existsById(id)) {
            throw new EntityNotFoundException("Roadmap entity not found");
        }
        roadmapGraphService.deleteGraph(id);
        roadmapRepository.deleteById(id);
    }

    public List<Roadmap> findByAuthorId(Long authorId) {
        return roadmapRepository.findByAuthor_Id(authorId);
    }

    public List<Roadmap> searchByTitle(String titlePart) {
        return roadmapRepository.findByTitleContainingIgnoreCase(titlePart);
    }

    public void assertCanEdit(Roadmap roadmap, Long userId) {
        Long authorId = roadmap.getAuthor() != null ? roadmap.getAuthor().getId() : null;
        if (authorId == null || !authorId.equals(userId)) {
            throw new RoadmapAccessDeniedException("Only the author can change this roadmap");
        }
    }
}
