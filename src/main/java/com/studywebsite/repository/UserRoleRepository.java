package com.studywebsite.repository;

import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserRole role where role.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
