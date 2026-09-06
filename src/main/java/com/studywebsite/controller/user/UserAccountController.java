package com.studywebsite.controller.user;

import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.service.auth.UserAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserAccountController {

    private final UserAccountService userAccountService;

    public UserAccountController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        userAccountService.deleteCurrentAccount(principal.userId());
        return ResponseEntity.noContent().build();
    }
}
