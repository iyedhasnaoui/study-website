# Authentication REST API

## Scope

This document explains the implemented registration, login, logout, and account-deletion API for the study platform.

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

## Implemented design

- Email is the unique login identifier and is normalized to lowercase.
- Passwords are hashed with BCrypt and raw passwords are never stored or returned.
- Login creates a random opaque bearer token. Only its SHA-256 hash is stored in `auth_sessions`.
- Bearer tokens expire after 24 hours by default and can be invalidated through the logout endpoint.
- New users receive the `USER` role.
- The API is stateless: clients send `Authorization: Bearer <accessToken>` on protected requests.
- Account deletion removes sessions and roles first. If the user owns platform content protected by database relationships, deletion returns `409 Conflict` until the team defines retention/anonymization rules.
- `Verification` remains grade/author evidence and is not used as an authentication credential.

## Request examples

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "correct-horse"
}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "correct-horse"
}
```

Use the `accessToken` returned by login:

```http
DELETE /api/auth/session
Authorization: Bearer <accessToken>
```

```http
DELETE /api/users/me
Authorization: Bearer <accessToken>
```

See the package README files and Java classes for the responsibility of each layer.
