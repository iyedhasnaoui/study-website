package com.studywebsite.service.auth;

public class DuplicateUsernameException extends RuntimeException {

    public DuplicateUsernameException() {
        super("An account with this username already exists");
    }
}
