package com.studywebsite.service;

import com.studywebsite.model.Resource;
import com.studywebsite.model.ResourceType;
import com.studywebsite.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {
    private final ResourceRepository resourceRepository;

    public Resource create(Resource resource) {
        return resourceRepository.save(resource);
    }

    public Resource getById(Long id) {
        return resourceRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<Resource> getAll() {
        return resourceRepository.findAll();
    }

    public void delete(Long id) {
        resourceRepository.deleteById(id);
    }

    public List<Resource> findByType(ResourceType type) {
        return resourceRepository.findByType(type);
    }

    public List<Resource> findByAuthorId(Long authorId) {
        return resourceRepository.findByAuthor_Id(authorId);
    }
}

