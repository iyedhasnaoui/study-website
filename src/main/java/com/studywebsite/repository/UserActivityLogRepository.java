package com.studywebsite.repository;

import com.studywebsite.model.UserActivityLog;
import com.studywebsite.model.ActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    List<UserActivityLog> findByUser_Id(Long userId);
    List<UserActivityLog> findByActionType(ActionType actionType);
}

