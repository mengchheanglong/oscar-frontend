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

In Documents, select a project and click **Add folder**. The compact dialog lists
files with search and explicit selection. Open a filename for an optional preview,
then click **Connect**. New folders start with nothing selected. **Select visible**
adds matching files within the limits; **Clear** clears the selection. The info
control explains transfer, indexing limits and snapshot replacement.

Every file extension is accepted, including extensionless and hidden files.
UTF-8 text up to 128 KiB is indexed as content. Selected PDF and DOCX files are
sent to the authenticated backend for text extraction only after Connect; originals
are not stored. Other binary files and larger text files provide searchable names
and metadata, not their contents. There is no image OCR, spreadsheet/slide
extraction, or media transcription in this version. Original files remain unchanged.
Selected content is stored privately in the backend and may reach the AI provider.

Use **Rescan** on a source card to review changes and **Disconnect** to remove the
index. New files start unselected during rescans. Browser permissions may need
renewal. Folder access uses the directory picker on localhost or HTTPS;
see [browser requirements](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker).
Unsupported browsers retain document uploads.

Limits: 100 indexed files, 512 KiB extracted text total, 128 KiB text per file,
and 10 MiB per original. Hidden and dependency/build directories are skipped;
individual hidden files can be explicitly selected. Scan limits remain bounded.
Rescans are manual. Extraction/indexing errors leave the previous snapshot intact.

Copilot's **Local files** source filter narrows retrieval to these sources.
Citations include paths and revisions; the inspector labels the current index
separately from the historical cited excerpt. Scanner checks run with
`pnpm test:local-folders`.


## Live source folders

Documents > **Source folders > Add folder** opens the native Windows folder
chooser on the local backend computer. Choose a directory to connect it;
cancelling makes no connection. Manual path entry is a fallback. Hermes **Agent work** lists, searches and reads
files as needed, including current edits, without a folder-wide indexing limit.
Connections are private to your account/project and read-only. The local
administrator connects folders; relevant read content may be sent to the AI provider.
The backend must enable `LOCAL_FILES_ENABLED` on loopback outside production
and have ripgrep installed. Local testing remains frontend 3002/backend 3001.

**Saved snapshots (optional)** retains the browser selection/indexing flow for
ordinary Copilot chat. Live folders currently work through Hermes Agent work;
chat does not automatically read them. UTF-8, PDF and DOCX contents are supported;
other binaries provide metadata. Live reads and searches use bounded pages,
not an unlimited context window. Disconnect removes the grant, not your files.
