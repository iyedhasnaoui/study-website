# Banned and deleted author visibility

Local investigation on 2026-11-23, based on freshly fetched
`origin/feat/roadmap-graph-enhance` at `670160a`.

## Reproduction and account representation

The bug still exists on the integration baseline. Approved posts by banned authors
return HTTP 200 to anonymous, VIEWER and CONTRIBUTOR readers. Admin removal has the
same exposure: `AdminUserService.removeUser` retains the local author, sets
`banned=true`, and clears `keycloakId` after deleting the identity-provider account.
A null Keycloak ID alone is not a deletion marker: legacy local accounts also have it.

The final regression matrix was also executed against the unchanged baseline backend.
Each of the six non-admin/banned-or-deleted cases failed 19 independent read assertions:
forum list/detail; reply list/detail under an active post; active-author replies under
a hidden post; roadmap list/detail/graph/nodes/node-detail/approved-title suggestions;
learning-material list/download; unified feed; post and reply attachment downloads;
and reply counts. All these exposures were reproduced locally, rather than inferred
solely from source inspection. The real admin-removal service was exercised with a
mocked Keycloak client and reproduced the retained post's public visibility too.
Active-author and ADMIN matrix cases passed on the baseline.

## Fix and changed files

The fix gates reads on the retained author's banned flag, before existing publication
and ownership checks. Non-admin lists omit hidden content; details/downloads return
404. Reply lists under hidden posts return an empty list. Admins bypass the author
gate, and the admin moderation queue remains unchanged. No entities, moderation
statuses, stored files, schema, or database records are deleted or migrated.

Production files, relative to this worktree:

- `src/main/java/com/studywebsite/security/AuthorVisibility.java`: shared author gate;
  missing authors fail closed, while legacy accounts remain readable.
- `src/main/java/com/studywebsite/controller/ForumPostController.java`: list/detail
  eligibility and filtered reply counts; moderators can inspect hidden authors' posts.
- `src/main/java/com/studywebsite/controller/ForumReplyController.java`: gates reply
  authors and parent-post authors on list/detail reads.
- `src/main/java/com/studywebsite/controller/RoadmapController.java`: author gate for
  roadmap detail and the existing graph visibility check.
- `src/main/java/com/studywebsite/controller/RoadmapNodeController.java`: protects
  node list/detail against bypassing the roadmap author's restriction.
- `src/main/java/com/studywebsite/service/RoadmapService.java`: filters list results
  and approved-title suggestions.
- `src/main/java/com/studywebsite/service/ZitounaService.java`: filters all three
  authored contribution areas in the unified feed and learning-material list/download.
- `src/main/java/com/studywebsite/service/media/ForumAttachmentService.java`: checks
  attachment, reply and parent-post authors before loading file bytes.

Test files:

- `src/test/java/com/studywebsite/zitouna/AuthorVisibilityIntegrationTest.java`:
  twelve reader-role/author-state cases and a retained-content account-deletion test.
  Includes all read surfaces above, active content, admin queue access, and retention.
- `src/test/java/com/studywebsite/security/AuthorVisibilityTest.java`: ownership cannot
  bypass the gate, null-author denial, admin access, and legacy-account handling.
- `src/test/java/com/studywebsite/controller/ForumReplyControllerTest.java` and
  `src/test/java/com/studywebsite/service/media/ForumAttachmentServiceTest.java`:
  complete the existing successful-read fixtures with authors required by the schema.

## Verification

All tests use local H2, disabled Docker Compose, and mocked JWT decoding. The new
download tests use temporary local files and mocked storage adapters. Keycloak account
deletion is mocked; no cloud database, online website, or Oracle deployment is contacted.

Focused command:

```sh
./gradlew test --tests '*AuthorVisibility*' --tests '*ForumPostControllerTest' --tests '*ForumReplyControllerTest' --tests '*ForumAttachmentServiceTest' --console=plain
```

The focused suite passes: 28 tests, zero failures. Full `./gradlew test --console=plain`: 122 tests,
102 passed and 20 failed. The identical 20 existing test methods also fail against
the original integration backend:

| Test class | Failing tests | Observed failure |
| --- | ---: | --- |
| RoadmapFeedIntegrationTest | 1 | Expected seeded tag ID absent |
| RoadmapGraphIntegrationTest | 11 | Roadmap creation returns 400 instead of 201 |
| RoleAccessControlTest | 1 | Roadmap creation returns 400 instead of 201 |
| ForumApprovalIntegrationTest | 7 | Revision/publication assertions and existing write-policy mismatches |

These existing failures were not repaired here. In particular, the existing pending
forum-revision exposure is separate from author eligibility and overlaps the separate
forum authorization work in PR #2. PR #2 and its branch were not modified.

## Scope and remaining issues

- Self-service deletion is a separate existing path: it attempts a hard delete and
  reports a conflict when contribution foreign keys prevent deletion. This fix tests
  the retained-author deletion representation implemented by admin removal.
- FAQ entries have no author relationship. Shared taxonomy tags keep their existing
  catalog/proposal policy; no proposer-based taxonomy policy was introduced.
- This is a backend origin-access fix. It does not revoke bytes already downloaded
  or previously cached under existing cache headers.
- Validation is local; no claim is made about the currently deployed website.

Branch: `fix/banned-user-content-visibility`.
Worktree: `/Users/zakariabouhamed/Documents/LAC website/iac-banned-user-content-visibility`.
No push, merge, deployment, or changes to other worktrees were performed.
