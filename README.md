# Continuum — Frontend

Continuum is a personal, chat-first workspace for business, finance, research,
project files, tasks, decisions, and AI-assisted work. This is an independent
repository derived from AI Workspace's develop branch, with its Git history
preserved. The original AI Workspace repositories remain separate.

- Frontend: https://github.com/mengchheanglong/continuum-frontend
- Backend: https://github.com/mengchheanglong/continuum-backend
- Working and default branch: `develop`.
- Local frontend: `http://localhost:3002`; local API: `http://127.0.0.1:3001`.
- Environment files, access tokens, uploaded content, and machine MCP settings
  stay local and are not part of this repository.

The inherited implementation guide and verification notes describe the original
foundation. Continuum's current direction is the personal workspace above.
Legacy `aiw_*` storage keys, API environment names, database migration identifiers,
and the existing isolated development database remain compatible with current
local data. Repository branding changes do not migrate or reset that data.

Next.js 14 App Router frontend for the Continuum, connected to the NestJS backend API.

## Features

- **Operational Copilot**: General Workspace mode for research, analysis, planning, and real project work across disciplines; specialized project modes remain available.
- **Agent work**: Project-scoped Hermes runs with persisted progress, Markdown reports, cancellation, explicit retries, and task proposals in the existing review dialog. Requires the backend run migration and a prepared/enabled Hermes runtime; configuration is documented in the backend's `docs/HERMES_RUNTIME.md`.
- **Private Copilot Memory**: Review, save, edit, and remove project context, working preferences, and lessons. Remember on a reply opens an editable draft before confirmation. Requires the backend's copilot-memory migration.
- **Public Showcase & Landing Page**: Modern hero sections with Aceternity & MagicUI-inspired animations, glassmorphism, and responsive layout.
- **Authentication & Sessions**: Server-side cookie sessions with CSRF synchronizer tokens, 1-click demo logins, and persistent auth state.
- **Workspace Dashboard**: Bangkok timezone (`Asia/Bangkok`) overdue task calculations, real-time completion progress (`done / (total - cancelled)`), quick actions hub, and recent activity feed.
- **Requirements**: Functional specifications, project-local keys (`AIW-REQ-X`), expandable acceptance criteria, multi-status filters, and versioned revisions.
- **Architectural Decisions (ADR)**: Structured views separating Decision Outcome from Context & Rationale, with project-local keys (`AIW-DEC-X`).
- **Tasks**: Actionable work items with due dates, priority badges, requirement links, 1-click status progression, and overdue warnings.
- **Meetings**: Meeting logs with smart time defaults, attendee tracking, and expandable notes & transcripts with versioning.
- **Documents**: File repository supporting PDF, DOCX, TXT, and Markdown (up to 20 MiB) with drag-and-drop upload, SHA-256 checksums, and streaming downloads.
- **Universal Search**: Multi-entity keyword search with clickable suggestion pills, faceted category tabs (`countsByType`), and snippets.
- **Non-blocking Toast Feedback**: Smooth notifications for all asynchronous user interactions.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

The default backend endpoint is `http://localhost:3000/api/v1`.

### 3. Run Development Server

```bash
pnpm dev
```

Opens on [http://127.0.0.1:3002](http://127.0.0.1:3002).

### 4. Build for Production

```bash
pnpm build
pnpm start
```

Local Windows builds use regular Next.js output to avoid standalone dependency
links interfering with repeated build cleanup. Linux production builds retain
standalone output for the existing container deployment.

## Demo Accounts

Pre-seeded in the development database:

- **Alice Developer** (`alice@example.com` / `Password123!`): Project Owner of Alpha Workspace (AIW)
- **Bob Manager** (`bob@example.com` / `Password123!`): Project Manager in AIW
- **Charlie QA** (`charlie@example.com` / `Password123!`): Contributor in Secure Workspace (SEC)
- **System Admin** (`admin@example.com` / `Password123!`): Global Administrator

## Hermes integration

Integrations includes Hermes Agent in the AI agents category. Search for Hermes
or open `/integrations?app=hermes` to inspect its configuration for the selected
project. The status comes from the authenticated project runtime endpoint;
configuration availability does not guarantee model-provider availability.
Configured projects can open Copilot and use Agent work for evidence research,
pricing calculations, and task drafts requiring review. Runtime configuration
and credentials remain on the backend.

Verified on develop with TypeScript, lint, a production build, and local browser
checks for configured status, catalog search, and simulated unconfigured/error
responses. These checks do not start model runs.

## Folder workspace

Documents > **Folders > Upload folder** opens the browser folder chooser. Files
of any format are stored as private originals with their relative paths. The
local connection and snapshot panels have been removed, leaving one folder flow.
The existing legacy data/endpoints remain intact.

Upload progress is saved on the backend. **Pause** leaves an incomplete copy;
after reopening the page, select **Resume** and choose the same unchanged folder.
Saved files are verified in bounded blocks and skipped; interrupted files restart
from their beginning. Changed files require discarding the copy and uploading a
new one. Browser file handles are not retained after a reload.

Backend settings control the account-wide original storage quota (20 GiB by
default), per-file size (1 GiB), folder file count (100,000) and source count (100).
There is no separate 2 GiB folder limit. Expand **Upload details** for the current
policy and usage. Originals upload first; text is prepared by a durable background
worker. The folder row shows pending preparation. Copilot searches prepared
content; Hermes discovers and reads completed folder copies as needed, including
bounded pages of large UTF-8 originals. Unsupported formats retain original
downloads and an explicit metadata-only preview. Relevant read content may be
sent to the AI provider.

These are copies, without background synchronization. Deleting a copy removes
its stored originals and index without changing the computer's source folder.
Cross-device access needs a reachable authenticated backend with persistent
storage. No hosting or cloud service is provisioned. Local testing uses
[Continuum](http://localhost:3002/documents) with
`NEXT_PUBLIC_API_URL=/api/v1` and `BACKEND_INTERNAL_URL=http://127.0.0.1:3001`.
The frontend proxies API requests to the isolated local backend. Login cookies
stay on the frontend's origin, so both localhost and 127.0.0.1 work. The explicit
IPv4 backend address avoids another app's localhost IPv6 listener.

Checks: `pnpm test:folder-resume` verifies fingerprint compatibility, block
boundaries, changed content and pause handling. The legacy scanner checks remain
available with `pnpm test:local-folders`.

## Personal workspace navigation (2026-10-16)

Home shows recent projects and the selected project's unfinished checklist,
conversations and agent runs. It replaces the management-statistics dashboard.
The main navigation is Home, Projects, Tasks, Files, Search, AI Copilot and Settings.
AI Copilot, its modes, Hermes execution, memory and history recall are unchanged.

Project pages provide links to Tasks, Files, Decisions and project Settings.
The overview contains the project brief rather than a software-delivery dashboard.
Use project files for detailed goals, requirements, research and meeting notes.
Requirements and Meetings are removed from primary navigation and creation
shortcuts; their existing routes, records and backend contracts are retained.
Decisions remain available inside the current project. Tasks offer a Kanban board and list view with creation, editing, assignees, priorities,
due dates and project filters. Review, blocked, done and cancelled stay distinct.

Project Settings contains existing edit/archive/ownership actions and project
membership controls (add an existing account, change access, confirmed removal).
Backend authorization remains authoritative. Settings contains Account,
Integrations and project sharing; user administration is shown only to admins.
The previous integrations URL still works, alongside /settings/integrations.
Files combines existing document uploads and private uploaded folder copies.
No existing records are migrated or deleted by this UI change.

Verification: frontend lint, TypeScript and production build passed. Local browser
QA covered navigation, project settings/member display, nested integrations,
files/folders, checklist creation and completion persisted through an API read,
and temporary task cleanup. Desktop and 390px Home screenshots were inspected;
no horizontal overflow was observed on the mobile Home. No membership changes
or AI generation were performed. AIW accepted-decision lookup failed (fetch
failed); no assigned task was supplied or marked complete. Backend continuity
work and frontend Copilot/API edits already present were left uncommitted and
unchanged. Only this navigation slice is committed locally on develop.

## One Copilot conversation

The assistant page now offers one general assistant rather than seven personas.
Use tools in the composer enables Hermes for a selected project. Its progress,
cancel control, report, sources and proposed-change review appear in the same
thread. Requests and results are saved as canonical messages, so a normal answer
can refer to a previous Hermes report. Reloading retains the work status/result.
The separate Agent work header/dialog is no longer used. Existing saved mode
values remain readable; new messages use Workspace behavior. Memory and context
exclusion controls remain available.

Hermes is still a bounded runtime with its existing tool allowlist. It receives
bounded recent conversation context; full private-history tools are future work.
Existing unthreaded runs remain available through the project API. They are not
silently copied into chat histories or rerun. Tools require a specific project;
ordinary All Workspaces questions remain supported. See the backend
`docs/UNIFIED_COPILOT.md` for the new migration/API and privacy behavior.

Verified with lint, TypeScript, production build, eight existing file tests,
desktop/mobile inspection, and a real calculator run followed by a normal answer
in the same thread after reload. The temporary QA conversation was hidden through
the normal deletion API. No project records or proposals were created by this QA.

## Task board refinement (2026-10-16)

Tasks is restored to the sidebar. Cards move between
statuses by dragging or with Space and arrow keys; Enter opens the editor.
Moving to Blocked asks for a reason before saving. Status changes are persisted;
manual card ordering within a column is not persisted by the API. Board/list
preference is remembered on this browser. All-project loading follows pagination.

The sidebar uses quieter neutral styling. The repeated project tab bar has been
removed at user request; project overview links and Settings still provide access
to project features. Copilot behavior is unchanged.

Verification: frontend lint, TypeScript and production build; local browser QA
covered creation, keyboard movement, edit/save and reload persistence, review and
blocked states, list preference persistence, and confirmed deletion of the temporary
QA task. Desktop and 390px mobile layouts were inspected; mobile page width stayed
at 390px while the board scrolls independently. AIW decision lookup returned no
architectural decisions. No assigned task was supplied or marked complete.

## Chat-first workspace (2026-10-16)

Sign-in and public Open Workspace links lead to /assistant. The app opens with a
new chat; previous conversations stay available in the sidebar. Projects and chat
history share one sidebar on the assistant page instead of two separate columns.
New chats use a centered composer; existing threads retain the scrolling transcript,
sources, memory and inline Hermes work controls. The suggestion-card grid is removed.

Tasks/Kanban, Files and Search remain direct sidebar links. Selecting a project
opens its chat context; its overview and decisions are available beneath the selected
project. Settings stays at the bottom. On other pages, Open chat returns to the
assistant; chat history is loaded when the assistant page is open. Mobile navigation
includes Escape dismissal, focus containment and focus restoration.

Verification: lint, TypeScript, production build, and browser checks of new-chat
entry, opening an existing thread, chat search, composer input/tools toggle,
Files and Kanban navigation, and mobile menu dismissal/focus restoration. Desktop
and 390px screenshots were inspected with no page overflow. No AI generation or
record deletion was performed. AIW accepted-decision lookup returned no decisions;
no assigned task was supplied or marked complete. Changes are frontend-only.

## Grok visual direction (2026-10-16)

The workspace now uses Grok's measured warm dark palette, muted chrome, rounded
composer, matching common icons, collapsible sidebar, and dark/light/system
appearance controls. Theme tokens reach existing workspace pages and dialogs.
Chat engines remain Assistant/Hermes. The composer plus menu uploads project
documents or opens Files, with drag-and-drop using the same upload service.
The app root opens chat; sign-in uses a centered form with no demo prefill.

Reference scope, measured values, implementation and verification are recorded in
[the Grok UI reference](docs/UI_REFERENCE_GROK.md). Signed-in-only Grok screens
were not available to scrape; the supplied screenshot guides that part of the UI.
