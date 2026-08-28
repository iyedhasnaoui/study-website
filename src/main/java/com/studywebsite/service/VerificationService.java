package com.studywebsite.service;

import com.studywebsite.model.Verification;
import com.studywebsite.model.VerificationStatus;
import com.studywebsite.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VerificationService {
    private final VerificationRepository verificationRepository;

    public Verification create(Verification verification) {
        return verificationRepository.save(verification);
    }

    public Verification getById(Long id) {
        return verificationRepository.findById(id).orElseThrow(() -> new RuntimeException("Entity not found"));
    }

    public List<Verification> getAll() {
        return verificationRepository.findAll();
    }

    public void delete(Long id) {
        verificationRepository.deleteById(id);
    }

    public List<Verification> findByUserId(Long userId) {
        return verificationRepository.findByUser_Id(userId);
    }

    public List<Verification> findByStatus(VerificationStatus status) {
        return verificationRepository.findByStatus(status);
    }
}

