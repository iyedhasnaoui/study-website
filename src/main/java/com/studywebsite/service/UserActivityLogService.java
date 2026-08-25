package com.studywebsite.service;

import com.studywebsite.model.UserActivityLog;
import com.studywebsite.model.ActionType;
import com.studywebsite.repository.UserActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserActivityLogService {
    private final UserActivityLogRepository userActivityLogRepository;

    public UserActivityLog create(UserActivityLog log) {
        return userActivityLogRepository.save(log);
    }

    public UserActivityLog getById(Long id) {
        return userActivityLogRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<UserActivityLog> getAll() {
        return userActivityLogRepository.findAll();
    }

    public void delete(Long id) {
        userActivityLogRepository.deleteById(id);
    }

    public List<UserActivityLog> findByUserId(Long userId) {
        return userActivityLogRepository.findByUser_Id(userId);
    }

    public List<UserActivityLog> findByActionType(ActionType actionType) {
        return userActivityLogRepository.findByActionType(actionType);
    }
}

