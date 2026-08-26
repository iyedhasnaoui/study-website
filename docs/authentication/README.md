# Authentication API - TODO Scaffold

## Scope

This folder describes planned registration and login APIs for the study platform. It contains no application code.

Authentication is shared platform groundwork: progress persistence, author verification, ratings/trust, roadmaps, uploads, and moderation all need an authenticated user identity.

## REST endpoint contract

| Endpoint | Purpose | Success | Important failures |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Create one account with safe default role(s). | `201 Created`; return public account data only. | `400` invalid input, `409` duplicate identifier. |
| `POST /api/auth/login` | Validate credentials and create an authenticated session/token response. | `200 OK`; return chosen authentication response plus public account data. | `400` malformed input, `401` invalid credentials. |
| `DELETE /api/auth/session` | Log the currently authenticated user out by invalidating their server session or refresh token. | `204 No Content`. | `401` no valid authentication. |
| `DELETE /api/users/me` | Permanently delete the current user's account and associated data according to the agreed retention policy. | `204 No Content`. | `401` no valid authentication, `409` deletion temporarily blocked by policy. |

## Mapping practice

- Use `@PostMapping` for registration and login. Both operations submit credentials and create/change authentication state; neither is a normal database-resource `GET`.
- Use `@DeleteMapping` for session removal and account deletion. The account endpoint deletes the current user's resource, while the session endpoint deletes the current authentication state.
- Keep `DELETE /api/users/me` separate from login/register. It makes the URL describe the resource being deleted and gives you a clean REST-controller exercise.

## Required decisions before coding

- Pick the unique login identifier: email, university ID, username, or a combination.
- Add that identifier and a password hash to `model/User.java`; never store raw passwords.
- Choose JWT access/refresh tokens or server-managed sessions.
- Define allowed roles and registration defaults. `UserRole` has role records but no role vocabulary.
- Decide password rules, account verification, rate limiting, lockout, reset flow, and shared API error format.
- `Verification` is for author/grade evidence, not automatically account/email verification.

## Order of work

1. Agree data-model/security decisions and migrations.
2. Create/validate DTOs.
3. Implement repository and service rules.
4. Implement controllers/security configuration, including `@PostMapping` and `@DeleteMapping` routes.
5. Add service and HTTP tests.

See the package README files for planned types and functions.
