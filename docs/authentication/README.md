# Authentication module

The authentication flow is deliberately split into the same layers used by the rest of the Spring application.

## REST endpoints

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Validate a new username, email and password; hash the password; create the user and default `USER` role. | Public |
| `POST` | `/api/auth/login` | Check the email and password, then issue a random bearer token with a 24-hour expiry. | Public |
| `DELETE` | `/api/auth/session` | Delete the current token and sign the user out. | Bearer token |
| `DELETE` | `/api/users/me` | Delete an empty account after removing its sessions and roles. | Bearer token |

## Responsibilities

- `controller/auth/AuthController` maps the register, login and logout HTTP requests.
- `controller/user/UserAccountController` maps deletion of the authenticated user's own account.
- `dto/auth` contains the validated JSON request and safe response shapes. Passwords and password hashes never appear in responses.
- `service/auth/AuthService` owns registration and credential checks.
- `service/auth/AuthTokenService` creates tokens, stores only their SHA-256 hashes and resolves valid sessions.
- `security/BearerTokenAuthenticationFilter` reads the `Authorization: Bearer ...` header and creates the Spring Security principal.
- `model/AuthSession` and `repository/AuthSessionRepository` persist revocable login sessions.
- `controller/ApiExceptionHandler` turns validation and authentication failures into consistent JSON errors.

The React client stores the current session in `sessionStorage`, automatically sends the bearer token and real user ID, and removes the local session after logout.
