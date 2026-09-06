package com.studywebsite.service.auth;

public class DuplicateAccountException extends RuntimeException {
    public DuplicateAccountException() {
        super("An account with this email or username already exists");
    }
}
