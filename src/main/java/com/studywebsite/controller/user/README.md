# Planned user-resource controller file

## `UserAccountController.java`

Owns REST operations on the signed-in user's account resource. Keep this separate from `AuthController`: authentication endpoints deal with logging in/out, while this controller deals with the user resource itself.

| Function | Mapping to practice | Responsibility | TODO |
| --- | --- | --- | --- |
| `deleteMyAccount(...)` | `@DeleteMapping("/me")` with controller base path `/api/users` | Handle `DELETE /api/users/me`, get the authenticated user identity from the security layer, ask the service to delete/anonymize the account as agreed, then return `204 No Content`. | Decide confirmation requirement, retention/anonymization rules, cascade behavior, and authorization lookup. |

Do not accept a user ID in the URL for this first exercise. Using `/me` prevents one ordinary user from attempting to delete another user's account. An admin-only `DELETE /api/users/{id}` can be planned later with explicit role checks.
