# Planned DTO files

## `RegisterRequest.java`

Registration JSON: chosen unique identifier, write-only password, and only product-approved optional profile data.

TODO: required fields, format/length rules, normalization, password policy, and unknown-field policy.

## `LoginRequest.java`

Login JSON: final identifier plus password.

TODO: reject malformed payloads without disclosing whether an account exists.

## `AuthenticatedUserResponse.java`

Safe account data after register/login.

TODO: choose account ID, display identifier/name, and only appropriate roles. Never include password/hash.

## `AuthResponse.java`

Authentication result wrapper.

TODO: JWT access/refresh tokens plus expiry, or session/cookie response data.

## `ApiErrorResponse.java` (shared, if not created elsewhere)

Consistent validation/duplicate/invalid-credential error envelope.

TODO: status, stable code, safe message, field errors, correlation ID.
