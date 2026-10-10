# AI Project Workspace — Frontend

Next.js 14 App Router frontend for the AI Project Workspace, connected to the NestJS backend API.

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
[AI Workspace](http://127.0.0.1:3002/documents) and API 127.0.0.1:3001 to avoid
another app's localhost IPv6 listener; keep their hostnames matched for cookies.

Checks: `pnpm test:folder-resume` verifies fingerprint compatibility, block
boundaries, changed content and pause handling. The legacy scanner checks remain
available with `pnpm test:local-folders`.
