package com.studywebsite.service;

import com.studywebsite.model.RatingCriteria;
import com.studywebsite.repository.RatingCriteriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RatingCriteriaService {
    private final RatingCriteriaRepository ratingCriteriaRepository;

    public RatingCriteria create(RatingCriteria criteria) {
        return ratingCriteriaRepository.save(criteria);
    }

    public RatingCriteria getById(Long id) {
        return ratingCriteriaRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<RatingCriteria> getAll() {
        return ratingCriteriaRepository.findAll();
    }

    public void delete(Long id) {
        ratingCriteriaRepository.deleteById(id);
    }

    public RatingCriteria findByName(String name) {
        return ratingCriteriaRepository.findByName(name).orElseThrow(() -> new RuntimeException("Entity not found"));
    }
}

