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
