package com.studywebsite.service;

import com.studywebsite.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminGuard {
    private final UserRoleRepository userRoleRepository;

    public void requireAdmin(Long userId) {
        if (userId == null || !userRoleRepository.existsByIdUserIdAndIdRoleIgnoreCase(userId, "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required");
        }
    }
}
