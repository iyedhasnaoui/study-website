package com.studywebsite.service;

import com.studywebsite.model.User;
import com.studywebsite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public User create(User user) {
        return userRepository.save(user);
    }

    public User getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> findByTrustScoreGreaterThan(Double score) {
        return userRepository.findByTrustScoreGreaterThan(score);
    }

    public List<User> findByNumberContributionsGreaterThan(Integer contributions) {
        return userRepository.findByNumberContributionsGreaterThan(contributions);
    }
}

