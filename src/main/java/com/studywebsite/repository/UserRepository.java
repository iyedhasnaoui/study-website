package com.studywebsite.repository;

import com.studywebsite.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByTrustScoreGreaterThan(Double score);
    List<User> findByNumberContributionsGreaterThan(Integer contributions);
}

