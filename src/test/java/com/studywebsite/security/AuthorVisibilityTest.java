package com.studywebsite.security;

import com.studywebsite.model.User;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuthorVisibilityTest {
    @Test void ownershipDoesNotBypassTheAuthorGate() {
        User banned = User.builder().id(1L).banned(true).build();
        for (AppRole role : new AppRole[]{AppRole.VIEWER, AppRole.CONTRIBUTOR}) {
            assertThat(AuthorVisibility.isVisible(banned, TestAuth.principal(1L, role))).isFalse();
        }
    }

    @Test void legacyAccountsAreNotMistakenForDeletedAccounts() {
        User legacy = User.builder().id(1L).keycloakId(null).banned(null).build();
        assertThat(AuthorVisibility.isVisible(legacy, null)).isTrue();
    }

    @Test void missingAuthorsAreHiddenExceptFromAdmins() {
        assertThat(AuthorVisibility.isVisible(null, null)).isFalse();
        assertThat(AuthorVisibility.isVisible(null, TestAuth.principal(2L, AppRole.ADMIN))).isTrue();
    }
}
