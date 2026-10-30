# IAC Website — release testing review

Updated 28 October 2026. This report separates the focused proposed contribution from the larger, preserved dirty worktree. **Nothing is staged, committed or pushed. Explicit staging/commit/push approval is pending.**

## Repository and scope

- Worktree: `roadmap-testing-review`; branch: `test/release-1.0-review`; starting HEAD: `16a4318e8763bd923ce313bb36650706ddeceba1`.
- Suitable PR target: `feat/roadmap-graph-enhance`. Remote inspection on 28 October returned `86298048a6ccc5668a0db1ae309c5b1d8c185f8e`, two commits ahead of starting HEAD. The remote review branch does not yet exist. No shared branch was changed.
- Existing tracked edits and untracked files were preserved. Mixed files are staged selectively: previous FAQ/filter/authentication work is excluded from the focused candidate. The original `study-website` checkout was not edited.
- DevRoleSwitcher, DevRoleOverrideFilter and the X-Dev-Role mechanism were not modified during this implementation; earlier local changes to them remain outside this candidate.
- Scope: tests/storage regressions, forum permissions and edit approval, material moderation descriptions, forum previews, this report. No production systems or existing development application data were accessed. The later migration follow-up below used its own disposable PostgreSQL container.

## A. Testing

### Newly executed on 28 October

The proposed source contents were assembled independently from HEAD in a temporary directory, including only the selected files/hunks. Tests were run there so that excluded local fixes could not make the candidate appear to pass. The future staged tree must match that tested source snapshot before committing. Automatic approval review rejected staging because it retained the earlier read-only prohibition. The Git index remains unchanged; explicit user approval is needed before staging. A patch and exact file manifest are prepared for review.

| Check | Focused candidate | Entire dirty worktree |
| --- | --- | --- |
| Full Gradle suite, JDK 17, isolated H2 | 88 passed; 0 failed/skipped | 101 passed; 0 failed/skipped |
| Frontend Vitest | 13 passed in 5 files | 30 passed in 9 files |
| Production build | Passed; ~706 kB main JS chunk warning | Passed; ~707 kB chunk warning |
| Linter | **Failed: 1 existing hook error, 13 warnings** | Passed: 0 errors, 13 warnings |
| Locked clean frontend install | Passed with `npm ci` | Existing installation used |
| Whitespace validation | Proposed patch checked without staging | `git diff --check` passed |

**Lint blocker:** the candidate retains HEAD's conditional `useAuth` call in `frontend/src/components/dev/DevRoleSwitcher.tsx`. The dirty worktree contains a pre-existing fix, but that file also changes simulation behavior and was explicitly excluded. No lint rule was disabled. Approval to commit/push this candidate must acknowledge the existing lint failure, or separately authorize a narrowly scoped hook-order fix. Dirty-worktree lint success does not certify the proposed commit.

The first new integration-test attempts failed because a fixture omitted the required tag type, then supplied an immutable tag set to Hibernate. Both fixtures were corrected without weakening assertions. A new frontend fixture initially omitted the session's `roles` array; it was corrected to match the actual authentication contract. Initial Gradle cache and GitHub DNS sandbox restrictions were resolved by retrying with authorized access. An initial `npm ci` invocation from the repository root failed because the package/lockfile are under `frontend`; it was then executed successfully in the isolated candidate's frontend directory.

### Commands and environment

```sh
# Repository root, JAVA_HOME set to an installed JDK 17:
./gradlew test --tests '*MaterialModerationIntegrationTest' --max-workers=1
./gradlew test --tests '*ForumApprovalIntegrationTest' --tests '*MaterialModerationIntegrationTest' --max-workers=1
./gradlew test --max-workers=1 --rerun-tasks
# frontend/:
npm ci --no-audit --no-fund
npm test
npm run build
npm run lint
# Repository root:
git diff --check
git diff --cached --check  # empty index; does not certify candidate contents
git ls-remote --heads origin test/release-1.0-review feat/roadmap-graph-enhance
```

Actual tools: Corretto JDK 17.0.18; Gradle wrapper 9.7.1; Node 24.22.1; npm 11.6.2. Node came from the existing Codex runtime; npm from the existing `~/.local/share/npm-11.6.2` installation. No duplicate runtime was installed and no existing application dependency was upgraded. The added test tools are Vitest 5.0.5, React Testing Library 16.3.3, user-event 14.6.8, jest-dom 7.0.1 and jsdom 30.1.3. The clean install used the existing proposed lockfile unchanged.

All newly executed backend integration tests used random in-memory H2 databases, disabled Compose and inert local Keycloak endpoints. JWT signature decoding is mocked; normal bearer-token role conversion, local provisioning, security filters, method authorization and database behavior are exercised. These are not tests of a real Keycloak server or signature validation. Frontend API calls are mocked.

### Existing versus new coverage

The starting commit had 67 backend tests: application context (1), repository tests (6), service tests (21), controller tests (9), attachment storage (4), role access (15), roadmap integration (11). It had no frontend test framework. The focused candidate includes:

- `LearningMaterialStorageServiceTest` (6): PDF round trip; fake/empty/mismatched/oversized file rejection; storage containment/missing reads; Windows client basename normalization. Prior local work, included with its storage fix.
- `ForumAttachmentServiceTest` (3): pending/rejected/needs-fixing post and reply attachment access denied; approved access allowed. Prior local work, included with its visibility fix.
- `ForumApprovalIntegrationTest` (11): anonymous/viewer write denial; normal contributor creation; owner edit/delete and non-owner denial; administrator edit/delete; forged ownership/status input ineffective; edited text private until approval; queue review; rejection/needs-fixing/resubmission; stale/missing review version rejection; partial edit preservation; unpublished edits remain unpublished; ownership, tags, replies and attachment records retained.
- `MaterialModerationIntegrationTest` (1): actual local PDF submission reaches the admin-only queue with description, title, type, filename, author, tags and date; it remains absent from the public material list.
- `PostCard.test.tsx` (6): anonymous/viewer/non-owner controls hidden; owner contributor and other administrator can edit/delete; submission confirmation; editor closes after permission loss.
- `PostContent.test.tsx` (2): short text complete; long preview, keyboard expansion, mouse collapse and full text/line-break preservation.
- `ModerationDetails.test.tsx` (3): readable multiline material description/metadata, no raw JSON, forum and roadmap review text retained.
- `ModerationQueue.test.tsx` (1): actual admin page renders the description and old/proposed forum text, and submits the reviewed version number.
- `Lifecycle.test.tsx` (1): existing 30-cycle timer/hash-listener cleanup regression.

The larger worktree's additional tests cover previously developed authentication simulation, autocomplete, forms, content filtering and FAQ behavior. Those files are preserved but excluded. The existing ContentWiringIntegrationTest owner-delete expectation was updated to the newly agreed policy; that file is also excluded from this focused candidate.

### PostgreSQL migration follow-up — 28 October

The pre-push migration check used PostgreSQL **16.15 ARM64**, from the cached repository-configured `postgres:16-alpine` image. A separate Compose project used tmpfs storage and a random loopback port; existing development databases/containers/volumes were untouched. No source/application/test code changed for this follow-up. Temporary validation tests were created only in exported copies outside the repository.

1. Starting commit `16a4318` created its actual old schema. One passing seed test inserted four synthetic posts (approved, pending, rejected and legacy null status), with two institution tags per post, four replies and eight post/reply attachment records.
2. The exact candidate application mappings ran with the repository's Hibernate `ddl-auto=update` mechanism against that same database. Two passing tests checked safe defaults and exercised contributor editing, private proposed content, admin queue review, rejection and approval on a migrated post. The behavior-test transaction rolled back its synthetic edits so unchanged data could be compared exactly.
3. Before/after snapshots covered all **20 public tables**. Every existing row/field matched, including all four posts, four replies, eight attachment records and eight tag links. All existing columns and constraints were preserved. Only five forum columns and one revision-status CHECK constraint were added. Existing `version` values became 0 and pending fields remained null.
4. A second actual update/startup passed the same two tests, emitted no additional forum ALTER statements, and retained identical data/schema snapshots.
5. Only the disposable container/network was removed afterward. No existing Docker volume was mounted or removed.

This validates upgrade safety for the starting schema and representative synthetic data, not every possible deployment schema drift or large-table/concurrent workload. PostgreSQL ALTER TABLE can take locks: review schema differences, take a backup and schedule a suitable deployment window. No versioned migration framework/script exists in this repository; the tested rollout uses its existing Hibernate update setting. Deploy the matching frontend/backend together for versioned moderation requests.

The candidate's 27-file audit found only the agreed testing/storage, forum permissions/revisions, moderation-description, preview and report changes. Existing locked application dependency versions were unchanged. Existing local auth/dev-role/FAQ/filter changes remain excluded. The candidate is deliberately not declared fully green: its inherited lint error remains, and owner-facing pending-edit retrieval/history and newer-target integration are documented limitations, not unfinished placeholder implementation.

The DevRoleSwitcher lint error was re-executed against both an export of starting HEAD and the candidate using the same installed linter. Both returned the identical `react-hooks(rules-of-hooks)` error at line 12: `useAuth` follows the early DEV guard return. The file is byte-identical to HEAD in the candidate; this contribution did not introduce it.

### Historical evidence only — 27 October

Earlier review work passed 89 H2 tests, 18 frontend tests, seven content tests on disposable PostgreSQL, build/lint and npm audit. Local browser checks covered Keycloak login and FAQ creation/edit/publication. Those results apply to the earlier broader dirty worktree, not the current focused candidate. Docker, PostgreSQL, real login, browser responsiveness and Windows execution were **not** rerun for this implementation. No memory leak was demonstrated; bounded lifecycle checks are not proof that no leak exists.

## B. Completed implementation, awaiting commit approval

### Forum authorization and approval

VIEWER cannot create, edit or delete posts. CONTRIBUTOR can create and edit/delete only their own posts. ADMIN can edit/delete any post and moderate submissions. Backend role checks and ownership remain authoritative; frontend controls reflect the same post policy. Reply authorization was not changed.

The user explicitly selected **keep the approved version public while a separate revision awaits review**. Approved posts now store proposed title/content separately. Public lists, post retrieval and discovery continue using approved text. Queue entries show the proposed text alongside the published version. Approval replaces the public title/content on the same post; rejection/needs-fixing leaves the approved version intact. Editing an unpublished submission keeps it in pending moderation. Both contributor and administrator edits to an already approved post take this review path.

Forum moderation requires the `version` from the queue response. A missing/stale version returns 409 rather than approving a newer proposal unseen by the reviewer. JPA optimistic locking also prevents concurrent writes from silently replacing each other. No pending fields are serialized in public post DTOs. Existing ownership, tags, replies and attachments are retained.

**Schema/deployment requirement:** `forum_posts` adds nullable `pending_title`, `pending_content`, `revision_status`, `revision_note`, plus non-null `version` defaulting to 0. The repository currently uses Hibernate `ddl-auto=update` and has no migration framework. Fresh H2 schema creation and a synthetic existing PostgreSQL 16.15 schema upgrade were tested; see the migration follow-up. The actual development/deployment database was not accessed. Review/back up the deployment database and verify these additive columns before deployment. Deploy the matching frontend/backend together because forum moderation now sends a version. The migration follow-up ran Hibernate update only on its isolated database; no existing development/deployment database was migrated.

Limitations: one latest pending revision per post, not a revision history; another edit replaces that pending proposal. There is no owner-facing pending-revision retrieval/editor or notification screen. The normal editor starts from public text; admins review pending text in the queue. Explicit stale-review rejection was tested; simultaneous multi-process races were not exercised. The PostgreSQL schema-upgrade follow-up used synthetic data, not a copy of a real deployment database.

### Material moderation descriptions

The API includes actual description, type and tag names while retaining title/author/submission date and existing metadata. The admin UI renders labeled text with preserved newlines instead of raw JSON; forum/roadmap content remains readable. Arbitrary objects are not dumped into the page. Only administrators can access the moderation queue.

### Forum previews

Posts longer than 600 characters have a collapsed preview with Read more / Show less buttons, `aria-expanded` and `aria-controls`. Short posts remain complete. Text is rendered safely with preserved line breaks and wrapping; attachments and replies remain separate. No detail routes or material previews were added.

### Included earlier storage/testing work

The focused candidate includes the existing test environment and storage fixes: PDF signature/size checks, client basename normalization, stream cleanup and denial of downloads from unpublished forum posts/replies. It does not include the other existing dev-role, FAQ, autocomplete, filter or documentation edits.

## C. Unresolved problems and excluded work

| Issue | Evidence / disposition |
| --- | --- |
| Exchange institution selection | Confirmed: selecting two institutions alone does not express required home/partner roles. The direct post form lacks explicit assignment controls. Do not infer the roles from arbitrary list order. Deferred. |
| Tags and tag types | Creating a tag type creates configuration, not a selectable tag. Proposed tags require approval. Confirmed: the admin approval path does not refresh the main approved-tag list; autocomplete has a per-mount snapshot. Some existing local improvements remain excluded. |
| Forum/FAQ item navigation | Confirmed: discovery discards individual item IDs and opens general sections. Detail routes/direct links are deferred. |
| Learning-material validation | Backend has string length/type constraints; numeric grade/course/roadmap rules need product requirements. File storage can leave an orphan if later tag resolution/database save fails. Deferred. |
| Material tag API overlap | Target commit 8629804 serializes `tagSelection`/nested `tagIds`, whereas LearningMaterialRequest expects `tags` with field-specific IDs. Static contract mismatch confirmed; exact runtime reject/ignore behavior needs a targeted test when integrating the target. Preserve teammate work and resolve deliberately. |
| FAQ/filter/form changes | Existing local fixes/tests for FAQ admin listing, async refresh/errors, filtering and tag-field mapping are preserved but not included in this focused proposal. Do not claim those fixes shipped here. |
| Viewer material/tag writes | Starting HEAD lacks contributor guards on those endpoints. Earlier local fixes remain excluded by tonight's forum-focused security scope. They require a separate reviewed contribution. |
| Auth cleanup | Inspection: `/api/me` failure clears the user but can retain dev override/header state in the broader local implementation. Outside tonight's scope. |
| Moderation UX | Description display fixed; mandatory decision reasons, action pending states, owner feedback and richer attachment preview remain unfinished. |
| Reply controls | Their UI/server policy still differs for some roles; tonight's agreed policy applies to posts only. |
| Build/lint | Existing large bundle warning and 13 lint warnings remain. Focused candidate retains the DevRoleSwitcher hook error described above. |

## D. Security and verification boundaries

- **Keycloak account linking:** inspection confirms email-based adoption/rebinding without requiring a verified email or an unbound legacy row; realm self-registration is enabled and email verification disabled. Potential account/ownership takeover depends on deployment/migration conditions. It was not exploited or established against real accounts. Team must decide a trusted migration/linking policy before shared accounts are exposed.
- **DevRoleSwitcher:** the reported 403 was explained by Spring Boot running without the dev profile; enabling it resolved that manual observation. Simulation deliberately permits authenticated local role switching in dev. Frontend visibility is not a security boundary. Its files/mechanism were not changed in this implementation; older local improvements are excluded from the candidate.
- **FAQ state race:** admin/public FAQ state is shared and response ordering deserves testing. Draft exposure was **not reproduced** and is not a confirmed vulnerability. Earlier late-response tests do not establish every admin-to-public ordering case.
- **Forum revisions:** public DTOs expose approved text only; bearer-token roles and owner IDs control writes. Queue/approval are admin-only; caller-supplied ownership and status fields cannot authorize publication. API tests use mock signature decoding, not real identity-provider validation.
- No production credentials, tokens or real account data were used or logged. No Docker volumes/database data were removed.

## E. Team decisions

1. Define explicit Exchange/Double-degree home and partner institution rules and UI.
2. Distinguish tag types from tags; agree proposal/approval management, inherited tag rules and refresh behavior.
3. Define learning-material metadata validation and reconcile the newer target's tag payload contract.
4. Specify rejection versus needs-fixing behavior, required reasons, owner feedback and whether revision history is needed. Tonight's approved policy preserves public text while an edit is reviewed; administrators' edits also await moderation.
5. Clarify forum attachments versus separately moderated learning materials, retention and file cleanup.
6. Agree account-linking/migration policy and review the PostgreSQL deployment schema against the tested starting schema. Decide whether to accept the inherited lint failure or authorize a separate hook-only correction.

## F. Future improvements

Forum/material detail pages and direct item links; material expand/collapse; custom Keycloak login theme; dropdown dismissal, FAQ checkbox alignment and other small UI work; bundle splitting; version/runtime declarations and Windows testing; CI and GitHub Projects later. None were implemented tonight.

## G. Proposed commits and exact source scope

Commit only after explicit approval; no force push, shared-branch merge or automatic PR creation. Suggested messages:

1. `test: add testing and storage regression coverage`
2. `fix: align forum permissions and edit moderation`
3. `fix: show material descriptions in admin queue`
4. `feat: add forum description expand/collapse`
5. `docs: update release testing review`

ZitounaService, ZitounaPage/api and ForumPostController contain unrelated pre-existing edits; only this implementation's hunks belong in the proposal. PostCard spans permissions and preview behavior and may be split between commits 2 and 4. ZitounaService spans commits 2 and 3. The final combined staged tree must match the isolated tested candidate. Actual commit hashes/push status must be reported after approval; this report does not invent them.

Exact proposed file manifest (27 files; mixed files contain selected hunks only):

```text
frontend/package.json
frontend/package-lock.json
frontend/vitest.config.ts
frontend/src/test/setup.ts
frontend/src/test/Lifecycle.test.tsx
src/test/resources/application.properties
src/main/java/com/studywebsite/service/LearningMaterialStorageService.java
src/test/java/com/studywebsite/service/LearningMaterialStorageServiceTest.java
src/main/java/com/studywebsite/service/media/ForumAttachmentService.java
src/test/java/com/studywebsite/service/media/ForumAttachmentServiceTest.java
src/main/java/com/studywebsite/model/ForumPost.java
src/main/java/com/studywebsite/dto/zitouna/ZitounaDtos.java
src/main/java/com/studywebsite/controller/ForumPostController.java
src/main/java/com/studywebsite/controller/ZitounaController.java
src/main/java/com/studywebsite/service/ZitounaService.java
frontend/src/features/zitouna/api.ts
frontend/src/features/zitouna/ZitounaPage.tsx
frontend/src/features/zitouna/components/ModerationDetails.tsx
frontend/src/features/forum/components/PostCard.tsx
src/test/java/com/studywebsite/zitouna/ForumApprovalIntegrationTest.java
frontend/src/test/PostCard.test.tsx
src/test/java/com/studywebsite/zitouna/MaterialModerationIntegrationTest.java
frontend/src/test/ModerationDetails.test.tsx
frontend/src/test/ModerationQueue.test.tsx
frontend/src/features/forum/components/PostContent.tsx
frontend/src/test/PostContent.test.tsx
REVIEW_REPORT.md
```

No excluded local change should be staged simply to obtain a green check. The target's two newer commits have not been merged/rebased into this branch. A plain patch check against its exported sources failed context matching in ZitounaPage.tsx, zitouna/api.ts and ForumPostController.java; that is not a three-way merge-conflict verdict. Integration requires deliberate reconciliation/revalidation without replacing teammate files. The same patch applied cleanly to an exported starting HEAD with whitespace errors treated as failures. Git status/diff and staged-source equality are checked before requesting final approval.

## Draft PR description — not opened

Align forum post controls and server authorization with contributor ownership and administrator privileges. Store edits to approved posts as separate pending revisions; keep public text unchanged until an administrator approves the version reviewed. Include material descriptions/metadata in readable moderation cards and add accessible forum previews.

Add isolated Vitest/RTL and backend test configuration plus storage and authorization regressions. Validation on the focused candidate: 88 backend and 13 frontend tests passed, clean install/build passed; lint retains one existing DevRoleSwitcher hook error and 13 warnings. The synthetic PostgreSQL 16.15 schema upgrade, repeat startup and migrated-post workflow passed the subsequent migration validation. Real Keycloak/Windows/browser rendering were not verified in this implementation. Existing unrelated local work is excluded. New additive forum revision/version columns and coordinated frontend/backend deployment are required.

## Messenger draft — not sent

I implemented forum owner/admin permissions, contributor edit reapproval while keeping the approved text public, readable material descriptions in moderation, and forum Read more/Show less. The focused candidate passes 88 backend tests, 13 frontend tests and the build. Its lint still reports the existing DevRoleSwitcher hook error; that tool was left untouched as requested. Nothing is committed or pushed yet. We still need agreement on Exchange home/partner rules, tag lifecycle, material validation/tag API, rejection feedback and account linking; Deployment-specific PostgreSQL schema comparison/backup and Windows verification remain; the disposable PostgreSQL migration check passed. PR link: not created.
