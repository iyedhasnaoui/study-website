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



