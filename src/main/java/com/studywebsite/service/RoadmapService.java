package com.studywebsite.service;

import com.studywebsite.model.Roadmap;
import com.studywebsite.repository.RoadmapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapService {
    private final RoadmapRepository roadmapRepository;

    public Roadmap create(Roadmap roadmap) {
        return roadmapRepository.save(roadmap);
    }

    public Roadmap getById(Long id) {
        return roadmapRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
    }

    public List<Roadmap> getAll() {
        return roadmapRepository.findAll();
    }

    public void delete(Long id) {
        roadmapRepository.deleteById(id);
    }

    public List<Roadmap> findByAuthorId(Long authorId) {
        return roadmapRepository.findByAuthor_Id(authorId);
    }

    public List<Roadmap> searchByTitle(String titlePart) {
        return roadmapRepository.findByTitleContainingIgnoreCase(titlePart);
    }
}