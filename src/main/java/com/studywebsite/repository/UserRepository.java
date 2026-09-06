package com.studywebsite.repository;

import com.studywebsite.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByTrustScoreGreaterThan(Double score);
    List<User> findByNumberContributionsGreaterThan(Integer contributions);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = "userRoles")
    Optional<User> findByEmailIgnoreCase(String email);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from User user where user.id = :userId")
    int deleteAccountById(@Param("userId") Long userId);
}

