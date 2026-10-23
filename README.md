# OSCAR — Frontend

## OSCAR & MAVIS foundation

The new product plan and Phase 0 baseline are documented in the sibling backend:
[vision and architecture](https://github.com/mengchheanglong/oscar-backend/blob/develop/docs/product/OSCAR_MAVIS_Vision_and_Architecture.md)
and [foundation](https://github.com/mengchheanglong/oscar-backend/blob/develop/docs/product/OSCAR_MAVIS_FOUNDATION.md).
In a new sibling checkout, these are under `../oscar-backend/docs/`; the existing
local `../continuum-backend/docs/` path remains supported.
Continuum remains the engineering foundation. Goals, reviewed MAVIS memory and
supervised Hermes/T3/Paperclip handoffs are implemented; their runtime readiness
still depends on local services and current authorization.

Use Node 24.14.0 and pnpm 10.32.1. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`,
and `pnpm build` here, or run `pnpm verify:foundation` from the sibling backend
to verify both repositories together. Frontend CI runs the same four checks.

The sibling backend repository owns Compose. From `../oscar-backend` (or the
existing local `../continuum-backend` folder), use
`pnpm stack:up` for the full Docker app on port 43100 with API port 43101. See its
`docs/DOCKER_LOCAL.md` for migrations, existing-data mounts, and Hermes limitations.
The frontend Docker build accepts `BACKEND_INTERNAL_URL` (default `http://api:43101`)
and uses `/api/v1` in the browser. Local environment files stay outside the image.

Continuum is a personal, chat-first workspace for business, finance, research,
project files, tasks, decisions, and AI-assisted work. This is an independent
repository derived from AI Workspace's develop branch, with its Git history
preserved. The original AI Workspace repositories remain separate.

- Frontend: https://github.com/mengchheanglong/oscar-frontend
- Backend: https://github.com/mengchheanglong/oscar-backend
- Working branch: `develop`; GitHub default branch: `main`.
- Local frontend: `http://localhost:43100`; local API: `http://127.0.0.1:43101`.
- Environment files, access tokens, uploaded content, and machine MCP settings
  stay local and are not part of this repository.

The inherited implementation guide and verification notes describe the original
foundation. The OSCAR & MAVIS blueprint defines the new product direction.
Legacy `aiw_*` storage keys, API environment names, database migration identifiers,
and the existing isolated development database remain compatible with current
local data. Repository branding changes do not migrate or reset that data.

Next.js 14 App Router frontend for Continuum, connected to its NestJS API.

## Navigation

Chat, Goals, Tasks, Knowledge, and Customize form the main workspace. Files and
memories share Knowledge; project menus retain decisions. Customize opens a
secondary sidebar for Plugins and Skills, while Settings → Integrations retains
its existing connection controls. Tasks includes recent delegated work. See [navigation and
compatibility](docs/NAVIGATION.md).

**Customize → Skills** manages your private central library. Start a chat message
with `/skill-name` to attach guidance to that conversation; later turns and
Hermes/T3/Paperclip handoffs inherit it. Typing `/` offers matching commands. The
empty library offers an optional Clear plan example. Connected workspaces can
read skills through OSCAR MCP. See the sibling backend’s
`docs/product/SHARED_SKILLS.md` for versioning and execution boundaries.

Goals includes **Briefing & spending**: current progress, blockers, agent outcomes,
opt-in daily/weekly briefings and a monthly reporting threshold. **Tasks → Agent
work → Review outcome** records a human check and optionally proposes a MAVIS
lesson for separate approval. Spending is user-reported USD execution cost;
unknown costs remain explicit and the threshold is not a hard spending cap.
Schedules run while the backend is online. See the backend's
[workflow guide](https://github.com/mengchheanglong/oscar-backend/blob/develop/docs/product/CHIEF_OF_STAFF_WORKFLOW.md).

## Features

- **Chat and citations**: Chat across the workspace or within a selected project, with grounded answers and source citations.
- **Agent work**: Project-scoped Hermes runs with persisted progress, Markdown reports, cancellation, explicit retries, and task proposals in the existing review dialog. Requires the backend run migration and a prepared/enabled Hermes runtime; configuration is documented in the backend's `docs/HERMES_RUNTIME.md`.
- **Copilot Memory**: Save, review, edit, and remove private preferences and useful lessons for future conversations.
- **Authentication & Sessions**: Server-side cookie sessions with CSRF synchronizer tokens and persistent auth state.
- **Global Search**: Search knowledge across every project from one workspace-wide view.
- **Decisions and Tasks**: Review architecture decisions and manage work in project context or across all projects.
- **Files**: Upload and search project documents, and manage private folder copies with resumable uploads.
- **Knowledge Graph**: A visual map of workspace knowledge is planned and currently marked “Coming soon.”
- **Projects, settings, and integrations**: Manage project context, membership, account preferences, GitHub, MCP, and Hermes connections.
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

The default local backend endpoint is `http://127.0.0.1:43101/api/v1`.

### 3. Run Development Server

```bash
pnpm dev
```

Opens on [http://127.0.0.1:43100](http://127.0.0.1:43100).

### 4. Build for Production

```bash
pnpm build
pnpm start
```

Local Windows builds use regular Next.js output to avoid standalone dependency
links interfering with repeated build cleanup. Linux production builds retain
standalone output for the existing container deployment.

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
[Continuum](http://localhost:43100/documents) with
`NEXT_PUBLIC_API_URL=/api/v1` and `BACKEND_INTERNAL_URL=http://127.0.0.1:43101`.
The frontend proxies API requests to the isolated local backend. Login cookies
stay on the frontend's origin, so both localhost and 127.0.0.1 work. The explicit
IPv4 backend address avoids another app's localhost IPv6 listener.

Checks: `pnpm test:folder-resume` verifies fingerprint compatibility, block
boundaries, changed content and pause handling. The legacy scanner checks remain
available with `pnpm test:local-folders`.

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

## Conversation context rail (2026-10-23)

Chat has a collapsible right rail with Skills, Plugins, and Files. Skills lists
the skills attached to the conversation, available for use. Plugins shows saved
Hermes runs, T3/Paperclip handoffs, and GitHub source citations; installed tools
alone do not appear. Files lists completed answer citations and recorded Hermes
file reads, excluding messages removed from context. Project uploads without a
conversation citation/read are not treated as used files. Cited files open the
existing source inspector.

The rail uses existing authenticated, conversation-scoped APIs. It opens beside
the narrower 15px chat feed on desktop and as a dismissible drawer below 1200px.
Project settings and chat context share the right-hand space. No backend schema
or API changes are required.

Verified with lint, TypeScript, 32 frontend tests, and a production build. Isolated
synthetic browser fixtures covered populated/empty conversations, resource counts,
conversation switching, mobile source inspection, and Escape/focus restoration.
Desktop 1440px and mobile 393px layouts were inspected; mobile had no horizontal
page overflow. The running local app was also checked without creating chat data.
