package com.studywebsite.controller.admin;

import com.studywebsite.security.AppRole;
import com.studywebsite.service.admin.AdminUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User management, available to ADMIN only. The class-level rule is a second line of defence
 * behind the {@code /api/admin/**} matcher in the security configuration.
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    public record RoleChangeRequest(@NotNull AppRole role) {
    }

    public record BanRequest(boolean banned) {
    }

    @GetMapping
    public ResponseEntity<List<AdminUserService.ManagedUser>> listUsers() {
        return ResponseEntity.ok(adminUserService.listUsers());
    }

    @PutMapping("/{keycloakId}/role")
    public ResponseEntity<Void> changeRole(
            @PathVariable String keycloakId,
            @Valid @RequestBody RoleChangeRequest request) {

        adminUserService.changeRole(keycloakId, request.role());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{keycloakId}/ban")
    public ResponseEntity<Void> setBanned(
            @PathVariable String keycloakId,
            @RequestBody BanRequest request) {

        adminUserService.setBanned(keycloakId, request.banned());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{keycloakId}/logout")
    public ResponseEntity<Void> endSessions(@PathVariable String keycloakId) {
        adminUserService.endSessions(keycloakId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{keycloakId}")
    public ResponseEntity<Void> removeUser(@PathVariable String keycloakId) {
        adminUserService.removeUser(keycloakId);
        return ResponseEntity.noContent().build();
    }
}
