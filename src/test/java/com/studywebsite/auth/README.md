# Planned authentication tests

## `AuthServiceTest.java`

Unit test the business rules with mocked persistence/security collaborators.

- Successful registration creates one user, hashes password, assigns only approved defaults.
- Duplicate identifier is rejected.
- Invalid registration input is rejected before persistence.
- Correct login issues the selected authentication result.
- Unknown identifier and wrong password have the same public invalid-credential outcome.
- No response/log helper exposes raw passwords or hashes.

## `AuthControllerIntegrationTest.java`

Test the real HTTP contract with test database/configuration.

- Register gives the agreed `201` safe JSON response.
- Validation and duplicates use agreed error format.
- Login success returns selected token/session response.
- Login failure returns `401` without account enumeration.
- Logout returns `204` and invalidates the agreed session/refresh token mechanism.
- `DELETE /api/users/me` returns `204` only for the signed-in user's own account.
- Register/login are public; logout/account deletion and a representative protected route reject anonymous access.

## Setup TODO

- Deterministic test users/roles and cleanup.
- Do not assert raw hashes except for explicit encoder tests.
- Match the final JWT/session configuration.
