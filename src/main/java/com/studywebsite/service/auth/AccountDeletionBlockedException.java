package com.studywebsite.service.auth;

public class AccountDeletionBlockedException extends RuntimeException {

    public AccountDeletionBlockedException() {
        super("The account cannot be deleted while it owns platform content");
    }
}
