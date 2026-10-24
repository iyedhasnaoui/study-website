package com.studywebsite.service.admin;

/** Raised when a request tries to grant, revoke or alter the fixed ADMIN role. */
public class ProtectedRoleException extends RuntimeException {
    public ProtectedRoleException(String message) {
        super(message);
    }
}
