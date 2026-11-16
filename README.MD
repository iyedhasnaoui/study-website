# Ifriqiya Academic Circle

The application is organised around three user-facing areas:

- **Zitouna** — unified discovery for forum posts, roadmaps, learning materials, and FAQs.
- **About us** — the project mission and community principles.
- **Profile** — registration, sign-in, and account controls.

## Zitouna model

Content is organised by tags rather than folders. Tags belong to one of four fields: institution, program/position, topic, or subtopic. A subtopic can be nested at most two levels below a topic. Tag types carry validation rules such as the number of required institutions or programs; the seeded Exchange and Double degree types require two institutions.

Users can filter the unified feed by content area and tags, search by title or aliases, and start a post from the filtered view. Those filters are passed into the post form. Missing tags can be proposed and enter the administrator queue.

Forum posts, roadmaps, and learning materials are submitted as `PENDING` and only become public after administrator approval. Comments remain immediate. If tag-type rules change, published content that no longer satisfies them is marked `NEEDS_FIXING`.

Learning-material uploads accept PDF, audio, and video files and capture optional context about the contributor's grade, solution approach, method, and followed roadmap. Files are stored below `uploads/materials`, which is ignored by Git.

## Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/zitouna/feed` | Search and filter the unified feed |
| `GET` | `/api/tags` | List approved tags and suggestions |
| `POST` | `/api/tags/proposals` | Propose a missing tag |
| `GET` / `POST` | `/api/learning-materials` | Browse or submit PDF/audio/video material |
| `GET` | `/api/faq` | Read published FAQ entries |
| `GET` | `/api/admin/moderation` | Review pending and needs-fixing content |
| `POST` | `/api/admin/moderation/{area}/{id}/{decision}` | Approve, reject, or request fixes |
| `POST` / `PUT` | `/api/admin/tag-types`, `/api/admin/tag-types/{id}` | Create or update validation rules |
| `POST` / `PUT` / `DELETE` | `/api/admin/faq`, `/api/admin/faq/{id}` | Maintain one-question/one-answer FAQ entries |
| `POST` / `DELETE` | `/api/admin/users/{id}/ban` | Ban or unban a contributor |

Administrator endpoints require an authenticated account that already has the `ADMIN` role in `user_roles`. The application deliberately does not auto-promote a registered user.

## Run locally

1. Start the backend with `gradlew.bat bootRun` on Windows or `./gradlew bootRun` on macOS/Linux. Docker must be available for the configured PostgreSQL service.
2. In `frontend`, run `npm install` and then `npm run dev`.
3. Open `http://127.0.0.1:5173/#home`.

The backend uses Java 17. Frontend production verification is `npm run build`; linting is `npm run lint`.




## Configuration

All environment-specific values are read from environment variables. Every variable has a default that matches local development, so **running locally needs no setup**.

### Backend (Spring Boot)

| Variable | Purpose | Local default | Test deployment |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Spring profile. `dev` registers `DevRoleOverrideFilter`, which the Dev Role Switcher needs | *(unset)* | `dev` |
| `PORT` | HTTP port | `8080` | platform-provided |
| `SPRING_DATASOURCE_URL` | JDBC URL | `jdbc:postgresql://localhost:5432/studydb` | your Postgres URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | DB credentials | `postgres` / `password` | your credentials |
| `SPRING_DOCKER_COMPOSE_ENABLED` | Auto-start `docker-compose.yml` on boot (it also overrides the datasource URL) | `true` | `false` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API, no trailing slash | `http://localhost:5173,http://127.0.0.1:5173` | the frontend origin, e.g. `https://app.example.com` |
| `KEYCLOAK_ISSUER_URI` | Issuer of the JWTs the API accepts | `http://localhost:8081/realms/iac` | `https://<keycloak-host>/realms/iac` |
| `KEYCLOAK_BASE_URL` | Keycloak URL for the backend's admin client | `http://localhost:8081` | `https://<keycloak-host>` |
| `KEYCLOAK_REALM` | Realm for the admin client | `iac` | `iac` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Admin client id | `iac-backend` | `iac-backend` |
| `IAC_BACKEND_SECRET` | Admin client secret (also used by the Keycloak realm import) | `backend-dev-secret` | a real secret |
| `APP_UPLOAD_FORUM_DIRECTORY` / `APP_UPLOAD_MATERIAL_DIRECTORY` | Upload folders | `uploads/forum` / `uploads/materials` | a persistent path |

### Frontend (Vite, build-time)

Vite inlines these when building, so rebuild after changing them. See `frontend/.env.example`; `frontend/.env.development` holds the local values.

| Variable | Purpose | Local default | Test deployment |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Backend base URL, no trailing slash | `http://localhost:8080` | `https://<api-host>` |
| `VITE_KEYCLOAK_URL` | Keycloak server | `http://localhost:8081` | `https://<keycloak-host>` |
| `VITE_KEYCLOAK_REALM` | Keycloak realm | `iac` | `iac` |
| `VITE_KEYCLOAK_CLIENT_ID` | Keycloak public client | `iac-frontend` | `iac-frontend` |

### Keycloak container (docker-compose)

| Variable | Purpose | Local default |
| --- | --- | --- |
| `FRONTEND_URL` | Frontend origin added to the `iac-frontend` client's redirect URIs/web origins on first realm import (the localhost entries are always kept) | `http://localhost:5173` |

For an already-imported realm, add the deployed frontend origin to the `iac-frontend` client in the Keycloak admin console instead.

### Dev Role Switcher in a deployed test build

The switcher sends an `X-Dev-Role` header that the backend honours only under the `dev` profile, so the backend needs just `SPRING_PROFILES_ACTIVE=dev`. The frontend shows and uses the switcher only when `import.meta.env.DEV` is true, which a normal `vite build` makes false. To keep it in a test build without code changes, build with:

```
NODE_ENV=development npx vite build --mode development
```

Do not use the `dev` profile or this build mode for a public deployment: any signed-in user could then grant themselves ADMIN.
