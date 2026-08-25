package com.studywebsite.service;

import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import com.studywebsite.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleService {
    private final UserRoleRepository userRoleRepository;

    public UserRole create(UserRole userRole) {
        return userRoleRepository.save(userRole);
    }

    public UserRole getById(UserRoleId id) {
        return userRoleRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<UserRole> getAll() {
        return userRoleRepository.findAll();
    }

    public void delete(UserRoleId id) {
        userRoleRepository.deleteById(id);
    }

    public List<UserRole> findByUserId(Long userId) {
        return userRoleRepository.findByUser_Id(userId);
    }

    public List<UserRole> findByRole(String role) {
        return userRoleRepository.findByIdRole(role);
    }
}

