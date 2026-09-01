package com.studywebsite.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 254, message = "Email must contain at most 254 characters")
        String email,

        @NotBlank(message = "Username is required")
        @Size(min = 1, message = "Username must be non-empty")
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must contain between 8 and 72 characters")
        String password
) {
}
