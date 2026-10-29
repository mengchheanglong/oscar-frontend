# OSCAR Frontend

The standalone **Graph** section at `/graph` connects permitted reference
books/files through starter-topic mentions. Search, follow topics or sources,
page through references, and inspect original indexed passages. The diagram
shows at most ten sources/topics; the paginated list shows twenty sources.
Unmapped references remain browsable. Links are discovery hints rather than
proof of author agreement or factual support. This first map covers the
independent reference corpus; project files retain their normal Knowledge view.
Graph has its own sidebar destination on desktop and mobile. The former
`/knowledge?view=graph` URL redirects to `/graph` for saved-link compatibility.

The web interface for OSCAR, a personal AI chief of staff for project planning,
research, and supervised execution. Conversations, reviewed memory, project
knowledge, and connected agents share one workspace.

Built with **Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS**.

## Repository responsibilities

| Repository                                                            | Responsibility                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **oscar-frontend**                                                    | Chat, navigation, source inspection, review flows, and workspace UI           |
| [oscar-backend](https://github.com/mengchheanglong/oscar-backend)     | Authentication, project data, memory, retrieval, MCP, and agent orchestration |
| [oscar-knowledge](https://github.com/mengchheanglong/oscar-knowledge) | Independent reference ingestion and evidence retrieval                        |

The frontend uses the backend API. It does not hold generation credentials, run
agent processes, or connect directly to either PostgreSQL database.

## Capabilities

- **Conversations:** Project-specific and all-project chats, saved history,
  Markdown responses, citations, and context exclusions.
- **Chat attachments:** Upload files into one private chat. Download originals,
  review a proposed memory, explicitly share a copy with project knowledge, or
  remove access through the context rail.
- **Memory and knowledge:** Manage reviewed memories, shared project references,
  and private folder copies. Existing project uploads remain project knowledge.
- **Goals and tasks:** Goal-linked work, task boards, delegated-work status,
  outcome review, and optional briefing and spending views.
- **Customize:** Manage plugins and a personal skill library. Attach guidance
  with `/skill-name`; the conversation retains it for later turns and supported
  agent handoffs.
- **Connected work:** Inspect Hermes, T3, Paperclip, GitHub, and MCP configuration.
  Execution depends on the backend, upstream runtime, and authorization.
- **Workspace controls:** Global search, project membership and instructions,
  account settings, and dark/light/system appearance.

The context rail shows attachments, attached skills, and recorded plugin or
source activity. Installing an integration alone does not mean it was used.
The knowledge graph remains planned and marked **Coming soon**.

## Local development

### Requirements

- Node.js **24.14.0** and pnpm **10.32.1**, matching the repository pins.
- A configured OSCAR backend on `http://127.0.0.1:43101`.
- Docker for the backend databases; the frontend dev server runs on the host.

Run from this repository. PowerShell examples are shown.

```powershell
pnpm install --frozen-lockfile
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
pnpm dev
```

Open [OSCAR](http://localhost:43100). Start and migrate the backend first using
its [local development guide](https://github.com/mengchheanglong/oscar-backend/blob/main/docs/operations/LOCAL_DEVELOPMENT.md).
Use an origin permitted by the backend's `APP_ORIGIN` configuration.

### Environment

| Variable               | Local value              | Purpose                                         |
| ---------------------- | ------------------------ | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `/api/v1`                | Same-origin browser API path                    |
| `BACKEND_INTERNAL_URL` | `http://127.0.0.1:43101` | Server-side rewrite destination; omit `/api/v1` |

Next.js proxies `/api/v1/*` to the backend, keeping browser sessions on the web
origin. Rebuild after changing a production rewrite or public environment value.
Never put provider keys, personal access tokens, or service secrets in
`NEXT_PUBLIC_*` variables. The optional Supabase fields in the template are not
required for the normal local backend-session flow.

### Production build

```powershell
pnpm build
pnpm start
```

The host server uses port **43100**. Windows builds use regular Next.js output;
production builds on other platforms use the existing standalone configuration.

For the local container stack, keep the frontend and backend in sibling folders
and run Compose from the backend. Follow its
[Docker guide](https://github.com/mengchheanglong/oscar-backend/blob/main/docs/operations/DOCKER_LOCAL.md),
including the explicit migration step. Host and container instances must not
compete for the same ports.

## Chat, files, and source policy

Composer uploads stay in their owning chat. Saving an edited memory is explicit;
uploading alone does not save memory or expose the original to other chats.
**Add to project knowledge** creates a shared reference copy. Removing an
attachment presents linked memories for review and invalidates earlier assistant
context that may contain its contents.

Chat attachments support text-based PDF, DOCX, TXT, Markdown, and CSV. Private
folder copies use their separate upload and preparation workflow; they are not
live synchronization with the user's computer.

The composer starts with **Knowledge** enabled for permitted reference sources.
Optional mode allows it to be switched off for a turn. A backend-required policy
shows a locked **Sources required** control. Source previews preserve provenance
and extraction notices. Citation identity is not a guarantee that every claim is
supported or every source page was fully understood.

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Focused checks include `pnpm test:markdown`, `pnpm test:chat-turn`,
`pnpm test:global-search`, `pnpm test:folder-resume`, and `pnpm test:github-sync`.
From the sibling backend, `pnpm verify:foundation` checks both application
repositories; it does not include the independent Knowledge test suite.

Check runtime availability and account access separately when validating an
integration. Documentation-only changes do not require provider calls or live
agent runs.

## Source layout

```text
src/
  app/          Routes, page composition, and global styles
  components/   Chat, workspace, integrations, and reusable UI
  context/      Authentication, preferences, and workspace state
  lib/          API clients, citations, and client utilities
test/           Client behavior and rendering tests
docs/           Navigation, design references, and verification notes
```

## Documentation

- [Navigation and compatibility](docs/NAVIGATION.md)
- [Response design research](docs/RESPONSE_DESIGN_RESEARCH.md)
- [Feature retirement](docs/FEATURE_RETIREMENT.md)
- [Citation inspection and completeness boundaries](docs/CITATION_INSPECTION.md)
- [Backend documentation map](https://github.com/mengchheanglong/oscar-backend/blob/main/docs/README.md)
- [Chat attachments](https://github.com/mengchheanglong/oscar-backend/blob/main/docs/product/CHAT_ATTACHMENTS.md)
- [Shared skills](https://github.com/mengchheanglong/oscar-backend/blob/main/docs/product/SHARED_SKILLS.md)

## Development conventions

Active development uses `main`. Keep environment files, credentials, uploads,
and machine-specific MCP configuration outside Git. Historical Continuum/AI
Workspace identifiers remain for compatibility. Deployment requires separate
hosting, transport security, authentication, and persistent-storage configuration.
