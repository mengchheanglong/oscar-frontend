# Full feature QA - 2026-10-18 (in progress)

Automated verification passes: ESLint, TypeScript, production build, and 21
frontend regression tests. Both Docker images build and the frontend proxy and
API readiness endpoints return 200. The backend checkpoint records 312 unit,
129 HTTP, and 87 PostgreSQL tests. No deployment API/database was used.

## Fixed and checked

- Guest drafts survive registration and first-project creation, including edits
  before creation. Logout clears a pending guest handoff.
- Global search includes indexed document bodies and owned private folder files.
  Search result links open the correct private folder path or GitHub source URL.
- Generated decision task proposals use the backend's actual response shape.
  Browser review/edit/selection/confirmation created exactly one selected task
  with the chosen assignee. The success state reflects confirmation.
- Removed the fake password-reset email flow and unused remember-me control.
  Account recovery describes the existing administrator reset path.
- Data controls describe project/all-project context accurately and open a new
  chat instead of clearing an obsolete browser key. Saved memory links to
  Personalization. Invitation wording reflects creation of shareable links.
- Source inspection distinguishes saved evidence from the latest document
  revision, so an answer's older excerpt is not presented as current content.

## Live acceptance evidence

Browser and local API checks cover registration/validation/login/logout,
project creation with an initial upload, task creation/edit/assignment,
decision creation/edit/revisions and reviewed AI task creation, private memory
create/edit/remove/remember-answer, all-project search and folder previews,
theme selection/persistence, PDF/DOCX/TXT extraction and revisions/downloads,
project roles/archive/restore, invitation acceptance/cancellation, password
change and session revocation, MCP discovery/read/token revocation, GitHub
sync/code indexing, and a successful Hermes research run. Real DeepSeek answers
were checked for project-specific and all-project facts, citations, idempotent
retry, and private memory recall.

The complete audit is still running. Remaining browser checks include responsive
navigation, keyboard interactions, remaining menus/settings, and failure/recovery
paths. Synthetic QA records remain isolated for these checks and must be removed
before the audit is marked complete. No fixtures, credentials or browser states
are tracked in Git.
