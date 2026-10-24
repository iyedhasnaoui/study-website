package com.studywebsite.controller.user;

import com.studywebsite.security.AppRole;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the signed-in caller is allowed to do. The frontend reads this to show the right role
 * badge and actions; the backend still checks every request on its own.
 */
@RestController
@RequestMapping("/api/me")
public class CurrentUserController {

    public record CurrentUserResponse(
            Long userId,
            String keycloakId,
            String username,
            String email,
            AppRole role,
            boolean canContribute,
            boolean canAdminister
    ) {
    }

    @GetMapping
    public ResponseEntity<CurrentUserResponse> me() {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        return ResponseEntity.ok(new CurrentUserResponse(
                principal.userId(),
                principal.keycloakId(),
                principal.username(),
                principal.email(),
                principal.role(),
                principal.canContribute(),
                principal.isAdmin()
        ));
    }
}
