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
Opens on [http://localhost:3001](http://localhost:3001).

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

## Local folder sources

In Documents, select a project and click **Connect local folder**. Review the
eligible paths and text previews, select files, then click **Index selected
files**. Files remain on your computer; selected text and relative paths are
stored as a private project snapshot on the backend and may reach the AI provider
when Copilot or Hermes uses them. Directory access is read-only.

Use **Rescan folder** to review changes and **Disconnect** to remove the index.
New files start unselected during rescans. The browser can remember folder access,
but may ask for permission again. Unsupported browsers keep the existing upload
flow. Folder access uses the browser directory picker on localhost or HTTPS;
see [browser requirements](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker).

This version handles UTF-8 text and code, with a maximum of 100 selected files and
512 KiB per source. Hidden paths, common credential filenames, dependency/build
directories, binaries, and files over 128 KiB are excluded. Review for sensitive
content before indexing. Scans are manual; there is no background watcher or file
editing. Existing document uploads remain available for PDF/DOCX and other files.

Copilot's **Local files** source filter narrows retrieval to these sources.
Citations include paths and revisions; the inspector labels the current index
separately from the historical cited excerpt. Scanner checks run with
`pnpm test:local-folders`.
