package com.studywebsite.repository;

import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByUser_Id(Long userId);
    List<UserRole> findByIdRole(String role);
}

