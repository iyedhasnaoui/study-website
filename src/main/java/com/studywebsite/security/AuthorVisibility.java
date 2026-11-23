package com.studywebsite.security;

import com.studywebsite.model.User;

/** Read-time author gate, in addition to each endpoint's existing moderation rules. */
public final class AuthorVisibility {
    private AuthorVisibility() {}

    public static boolean isVisible(User author) {
        return isVisible(author, CurrentUser.find().orElse(null));
    }

    public static boolean isVisible(User author, AuthenticatedUserPrincipal principal) {
        // Admin deletion preserves the local author with banned=true and keycloakId=null.
        // A missing Keycloak id alone also occurs for legacy accounts, so it is not a deletion flag.
        return (principal != null && principal.isAdmin())
                || (author != null && !Boolean.TRUE.equals(author.getBanned()));
    }
}
