# Planned repository files

## `UserRepository.java`

Spring Data repository for identity lookup and duplicate checks.

| Function | Responsibility | TODO |
| --- | --- | --- |
| `existsBy...(...)` | Check whether the final unique account identifier already exists. | Name after the selected `User` field and add a unique database constraint/index. |
| `findBy...(...)` | Find user by login identifier during authentication. | Return optional result; decide how roles are fetched. |
| `deleteById(...)` or aggregate deletion | Remove the user after `UserAccountService` has applied the agreed retention policy. | Do not use a direct delete until relationships/cascade effects are reviewed. |

## `UserRoleRepository.java` (only if required)

Use only when role assignment/query cannot be handled cleanly through the user aggregate.

| Function | Responsibility | TODO |
| --- | --- | --- |
| `findRolesByUserId(...)` | Retrieve roles used to build authenticated authorities. | Decide eager, join-fetch, or dedicated query. |

Repositories contain persistence queries only: no validation, password comparison, or token creation.
