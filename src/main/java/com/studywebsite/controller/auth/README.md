# Planned authentication controller files

## `AuthController.java`

Owns HTTP routing only. It must not hash passwords, query the database, or sign tokens.

| Function | Mapping to practice | Responsibility | TODO |
| --- | --- | --- |
| `register(RegisterRequest request)` | `@PostMapping("/register")` | Handle `POST /api/auth/register`, validate the request, call `AuthService`, and return `201 Created` with `RegisterResponse`. | Decide location header and shared error mapping. |
| `login(LoginRequest request)` | `@PostMapping("/login")` | Handle `POST /api/auth/login`, validate the request, call `AuthService`, and return the agreed authenticated response. | Decide cookie/header/body response and error mapping. |
| `logout(...)` | `@DeleteMapping("/session")` | Handle `DELETE /api/auth/session`, ask the service to invalidate the current session/refresh token, and return `204 No Content`. | Decide whether logout is required for JWT and how the current session/token is identified. |

Use DTOs only; never return `User`, `UserRole`, a password, hash, verification path, or internal trust details.
