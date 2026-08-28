package com.studywebsite.service.auth;

import com.studywebsite.repository.AuthSessionRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.UserRoleRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAccountService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuthSessionRepository authSessionRepository;

    public UserAccountService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            AuthSessionRepository authSessionRepository
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.authSessionRepository = authSessionRepository;
    }

    @Transactional
    public void deleteCurrentAccount(Long userId) {
        if (!userRepository.existsById(userId)) {
            return;
        }

        authSessionRepository.deleteAllByUserId(userId);
        userRoleRepository.deleteAllByUserId(userId);

        try {
            userRepository.deleteAccountById(userId);
        } catch (DataIntegrityViolationException exception) {
            throw new AccountDeletionBlockedException();
        }
    }
}
