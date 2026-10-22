# OSCAR navigation

The main navigation is Chat, Goals, Tasks, and Knowledge, followed by projects
and chat history. Project selection remains active across those views; All projects
restores the combined workspace view.

- Chat is the entry point for advice and reviewed delegation.
- Goals retain direction, success metrics, and measured progress.
- Tasks contains Your tasks and Agent work. Agent work combines the actor's
  recent Hermes runs and T3/Paperclip handoffs, with partial-load failures made
  explicit. Results link back to their original chats. Hermes drafts use the
  existing proposal review dialog; native platform approvals stay in the platform.
- Knowledge contains Files & sources and Memories. Memory review, corrections,
  deletion, scope, and provenance retain their existing API behavior. Connected
  repositories and agents are managed in Settings → Integrations.
- Decisions remain available from each project's menu and global search. Decision
  history and existing goal links are retained.
- Global search is the globe button at the top of the sidebar. The adjacent
  magnifying glass and Ctrl/Cmd+K retain private chat search.

Compatibility: /documents and /memories remain functional entry points into
Knowledge. /platforms redirects to Settings → Integrations → Agent connections.
/tasks?view=agents opens Agent work; /knowledge?view=memories opens Memories.
The former Knowledge graph placeholder and its unused styles are removed.
No backend feature, project record, decision, file, memory, or connection is deleted.

Agent work reads at most 30 Hermes runs and 100 handoffs per project. It is a
recent-work view, not a complete execution archive. Refresh reloads status; it
does not dispatch new work or approve anything. External results and goal outcomes
remain separate concepts.

## Verification — 2026-10-22

Frontend lint, typecheck, 29 tests, and production build passed. Backend typecheck,
lint, formatting, build, and 19 handoff integration tests passed; OpenAPI documents
the optional conversation filter. Synthetic browser QA on a private preview
checked desktop and 393px layouts, project scope, the Decisions menu, both searches,
Knowledge tabs, and the legacy Platforms redirect. This is UI regression coverage,
not a claim of live provider acceptance. The normal backend on port 3001 remains
stopped pending activation of the updated application.

## Goals and Memories visual refinement — 2026-10-22

Goals and Memories share the Files page's neutral palette, 1120px content width,
compact actions, 36px filters/search, and solid rounded empty-state surface. Goals
uses the normal page canvas rather than a boxed header and nested scrolling area.
Memory status filters retain their behavior and expose their pressed state. Color
is retained for meaningful status indicators; recall and form actions use the
workspace palette. Goal table scrolling stays inside its container on mobile.

Verification: frontend lint, typecheck, all 29 existing tests, and the production
build passed. Synthetic browser checks covered empty and populated pages, Goals
grid/table switching, add forms, and 393px layouts without page overflow. These
are visual changes; no backend/API or user-record changes were made.
