# Planned security files

## `SecurityConfig.java`

Central security policy.

| Item | Responsibility | TODO |
| --- | --- | --- |
| `passwordEncoder()` | Provide approved adaptive password hashing. | Choose algorithm/cost; never write a custom hash. |
| Filter-chain configuration | Permit register/login, protect logout and account deletion, configure CORS/CSRF to match token/session choice. | Agree frontend origins and route policy. |
| Authentication-provider configuration | Link account lookup/password checking to Spring Security when required. | Choose custom provider or service-led flow. |

## `JwtService.java` and `JwtAuthenticationFilter.java` (JWT only)

| Function | Responsibility | TODO |
| --- | --- | --- |
| `createAccessToken(User user)` | Create short-lived signed token with minimal identity/role claims. | Define keys, issuer, audience, expiry, claims. |
| `validateAndReadToken(token)` | Verify signature and required claims. | Define expired/revoked behavior. |
| `doFilterInternal(...)` | Extract bearer token, validate it, set valid principal. | Define skip paths and errors. |

Keep secrets out of source control; do not log passwords, hashes, tokens, or identity documents.
