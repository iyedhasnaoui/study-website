# IAC login theme

`iac/login` extends the bundled Keycloak 26.0 `keycloak` login theme. It uses
shared cream, navy and gold tokens from `frontend/src/index.css`, Georgia heading
typography and an unchanged copy of `frontend/public/assets/iac-logo.jpeg`.
No FreeMarker templates or JavaScript are overridden: form actions, user-profile
fields, password toggles, ARIA attributes, translations and validation remain native.
The English registration heading is the only message override.

The Compose bind mount makes the theme available; `realm-iac.json` selects it on
first import. Existing realms are not updated by `--import-realm`. To inspect an
existing **local** realm, select `iac` under Realm settings → Themes → Login theme.
Do not change registration settings. No production activation is part of this change.
See [Keycloak's theme documentation](https://www.keycloak.org/ui-customization/themes).

## Local preview

With Docker running and a fresh, isolated Compose project:

```sh
docker compose -p iac-auth-theme-preview up -d keycloak
```

Open the following URL, then use Register / Forgot Password / Back to Login:

```text
http://127.0.0.1:8081/realms/iac/protocol/openid-connect/auth?client_id=iac-frontend&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2F&response_type=code&scope=openid&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256
```

This URL is for rendering forms; it does not provide a complete application PKCE
callback. Stop with `docker compose -p iac-auth-theme-preview stop`.
Do not start it if ports 8081/5432 are occupied by another local project.

### Standalone alternative (used for verification)

Docker's daemon was unavailable. A fresh official Keycloak **26.0.0** distribution
was extracted under `/private/tmp/keycloak-26.0.0`, running with Java **21** and its
default disposable development store. No application or deployed database was used.
To reproduce, extract a fresh distribution into a scratch directory and set
`IAC_PREVIEW_KC` to that directory. Run these commands from the repository root:

```sh
mkdir -p "$IAC_PREVIEW_KC/data/import"
ln -s "$PWD/keycloak/themes/iac" "$IAC_PREVIEW_KC/themes/iac"
python3 - "$IAC_PREVIEW_KC" <<'PY'
import json, re, sys
from pathlib import Path
# The existing realm contains ${env.NAME:default} placeholders which standalone
# 26.0 did not resolve. Resolve defaults ONLY in this disposable preview copy.
text = Path('keycloak/realm-iac.json').read_text()
text = re.sub(r'\$\{env\.[^:}]+:([^}]+)\}', lambda m: m[1], text)
json.loads(text)
(Path(sys.argv[1]) / 'data/import/realm-iac.json').write_text(text)
PY
JAVA_HOME=$(/usr/libexec/java_home -v 21) "$IAC_PREVIEW_KC/bin/kc.sh" start-dev \
  --http-host=127.0.0.1 --http-port=8180 --import-realm \
  --spi-theme-cache-themes=false --spi-theme-cache-templates=false \
  --spi-theme-static-max-age=-1
```

Use the URL above with port **8180**. Stop with Ctrl-C. Use only a fresh disposable
distribution; do not point these instructions at an existing server installation.

## Verification (2026-11-23)

- Real Keycloak 26.0 pages previewed at desktop 1440px and mobile 390px/320px.
- Login and registration at 320px: document width equals viewport; no horizontal overflow.
- Native invalid-credentials message rendered after submitting an unknown username.
- Empty registration rendered native required-field errors; mismatched passwords
  rendered the native confirmation error. All six required fields remained:
  username, password, confirmation, email, first name and last name.
- Password visibility button switched the registration password input to text and
  its accessible label to “Hide password”. Native labels and controls were present
  in the browser accessibility tree. Focus styling was visually checked.
- Reset-password form and return links opened with the same visual theme.
- `docker compose config --quiet`, `git diff --check`, exact logo comparison and
  JSON comparison (only `loginTheme` added) passed.
- Not verified: successful login callback, successful account creation, email
  delivery / reset completion, screen-reader operation, other browsers, or
  optional flows not enabled by this realm. No account was created.
- The Compose runtime was not started because its daemon was unavailable; the
  standalone preview used resolved defaults in its temporary realm copy only.

Screenshots are local review artifacts under `/private/tmp/iac-auth-theme-screenshots`;
they are not runtime assets. The preview process was stopped after verification.
