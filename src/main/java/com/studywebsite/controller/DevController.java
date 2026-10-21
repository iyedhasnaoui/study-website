package com.studywebsite.controller;

import com.studywebsite.model.User;
import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.UserRoleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev")
@Profile("dev")
@RequiredArgsConstructor
public class DevController {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    // To promote a user to an admin ( testing purposes )
    // look for the id of the user account
    // docker exec -it study-website-postgres-1 psql -U postgres -d studydb -c "SELECT id, username, email FROM users;"
    // once found post a request on this endpoint with the userId in the path

    @PostMapping("/promote/{userId}")
    public ResponseEntity<String> promoteToAdmin(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

        UserRoleId roleId = new UserRoleId(userId, "ADMIN");
        boolean alreadyAdmin = userRoleRepository.findByUser_Id(userId).stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getRole()));

        if (!alreadyAdmin) {
            userRoleRepository.save(UserRole.builder()
                    .id(roleId)
                    .user(user)
                    .role("ADMIN")
                    .build());
        }

        return ResponseEntity.ok("User " + userId + " (" + user.getUsername() + ") promoted to ADMIN");
    }
}