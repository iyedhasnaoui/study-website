package com.studywebsite.repository;

import com.studywebsite.model.Verification;
import com.studywebsite.model.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VerificationRepository extends JpaRepository<Verification, Long> {
    List<Verification> findByUser_Id(Long userId);
    List<Verification> findByStatus(VerificationStatus status);
}

