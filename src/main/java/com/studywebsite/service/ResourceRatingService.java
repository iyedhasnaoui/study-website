package com.studywebsite.service;

import com.studywebsite.model.ResourceRating;
import com.studywebsite.repository.ResourceRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceRatingService {
    private final ResourceRatingRepository resourceRatingRepository;

    public ResourceRating create(ResourceRating rating) {
        return resourceRatingRepository.save(rating);
    }

    public ResourceRating getById(Long id) {
        return resourceRatingRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<ResourceRating> getAll() {
        return resourceRatingRepository.findAll();
    }

    public void delete(Long id) {
        resourceRatingRepository.deleteById(id);
    }

    public List<ResourceRating> findByResourceId(Long resourceId) {
        return resourceRatingRepository.findByResource_Id(resourceId);
    }

    public List<ResourceRating> findByUserId(Long userId) {
        return resourceRatingRepository.findByUser_Id(userId);
    }

    public List<ResourceRating> findByCriteriaId(Long criteriaId) {
        return resourceRatingRepository.findByCriteria_Id(criteriaId);
    }
}

