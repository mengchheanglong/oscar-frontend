# Continuum repository split

## OSCAR repository rename — 18 October 2026

The private repositories are now
[`oscar-frontend`](https://github.com/mengchheanglong/oscar-frontend) and
[`oscar-backend`](https://github.com/mengchheanglong/oscar-backend). Their Git history
is preserved; `main` remains the GitHub default and local work stays on `develop`.
Package names, image tags, and deployment templates use OSCAR. UI/API branding and
persisted records remain compatible with the existing Continuum application. The
local development database was separately renamed to `oscar` in place on
2026-10-22; its records and migration history were preserved.

Windows currently blocks the local folder rename, so this machine retains the
`continuum-*` folder names with updated OSCAR remotes. Both layouts are supported
by the backend verification script. The ignored backend `.env` selects the
existing frontend folder for Compose; its project name remains `continuum-backend`
to preserve the existing container/volume identity.

## Original split

Continuum was separated from AI Workspace on 2026-10-17. Its current product
goal is a personal chat-first workspace for business, finance, research, files,
Kanban tasks, decisions, memory, and Hermes agent work.

The frontend and backend use separate private repositories, with `develop` as
their working branch and `main` as their GitHub default. Git history is preserved. No changes are pushed
to the original AI Workspace repositories.

## Local continuity

The local environment files are ignored. On the current machine they use the
existing isolated `oscar` database on 127.0.0.1:55432, frontend
port 3002, and API port 3001. Backend storage paths point to existing local files
to keep current document records readable. User project titles and records have
not been renamed. No database reset, seed, or schema migration is part of the split.

The new Compose project is continuum-backend. Do not launch its database alongside
the existing AI Workspace database container on port 55432. This machine can
continue using that existing isolated PostgreSQL service. A fresh installation
should provision its own database and local configuration.

The original split used Continuum for public application branding, API
documentation, and generated MCP labels. The repository/package rename does not
by itself replace those UI/API identities. Legacy API
environment variable names, migration identifiers, browser storage keys, and
internal class names stay compatible with inherited clients and data. Existing
AIW MCP records and historical implementation documents are baseline references.

The inherited deployment templates are setup examples; creating these repositories
does not create or modify any hosted deployment.
