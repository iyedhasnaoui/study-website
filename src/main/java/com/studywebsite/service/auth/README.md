# Planned service files

## `AuthService.java`

Business entry point for registration and login.

| Function | Responsibility | TODO |
| --- | --- | --- |
| `register(RegisterRequest request)` | Normalize the identifier, reject duplicates, apply password policy, hash password, create `User`, assign default roles, return safe account data. | Agree transaction, role, normalization, and verification rules. |
| `login(LoginRequest request)` | Find account, compare password with the approved encoder, optionally record an audit event, create authentication result. | Agree error wording, rate limit/lockout, and audit fields. |
| `logout(CurrentAuthentication authentication)` | Invalidate the current server session or refresh token and record an approved audit event. | Define JWT revocation needs and behavior when no session exists. |

## `AuthTokenService.java` or `SessionService.java`

Create only the component matching the chosen authentication strategy.

| Function | Responsibility | TODO |
| --- | --- | --- |
| `issueAuthentication(User user)` | Create JWT pair or server session after successful registration/login. | Choose JWT/session, expiry, refresh, and revocation. |
| `invalidateAuthentication(...)` | Revoke an existing token/session when logout is added. | Define storage and revocation strategy. |

The service owns credential validation and hashing. Do not reuse `Verification` for credentials without an explicit domain decision.

## `UserAccountService.java`

Owns user-resource actions which should not be placed inside login/register logic.

| Function | Responsibility | TODO |
| --- | --- | --- |
| `deleteCurrentAccount(CurrentAuthentication authentication)` | Find the authenticated user and delete or anonymize their account according to the platform's retention policy. | Agree handling of authored roadmaps/posts/resources, verification evidence, ratings, audit logs, and database cascades before coding. |
