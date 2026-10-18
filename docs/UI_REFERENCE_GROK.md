# Workspace UI reference: Grok

User direction: use Grok's full visual language for the personal workspace.
Reference inspected at https://grok.com/ on 2026-10-16, plus the user's signed-in
sidebar screenshot. Public home, attachment/mode controls, and appearance menu
were inspected in a real browser. Signed-in-only pages were not accessible in
that browser, so this is not a claim of a complete authenticated-site scrape.

## Measured reference

- Canvas: rgb(19, 18, 17), primary text rgb(252, 252, 252), secondary rgb(158, 158, 158).
- Reference font stack: universalSans, Inter, Roboto, Open Sans, Arial, system sans.
  Workspace retains its bundled Inter font as the available fallback.
- Public welcome heading: 24px, weight 550, line-height 32.4px. Signed-in reference
  has a larger work canvas; workspace uses 24px desktop and mobile.
- Public composer is 752px at a 1440px viewport; the supplied signed-in screenshot
  uses a wider composer. Workspace caps it at 752 CSS pixels, matching 940 display pixels at 125% zoom.
- Rounded pill controls, circular icon actions, muted surfaces, minimal borders.
- Public plus, send, settings and mark SVG paths are captured in workspace-icons.
  Workspace-specific glyphs are drawn on the matching 24px grid.

## Implementation

`src/app/workspace-theme.css` holds dark/light design tokens, component styling,
and a compatibility layer for existing neutral Tailwind classes. Status colors
remain meaningful in tasks and alerts. Root CSS variables also reach dialogs
and portals. Tailwind's existing codex aliases now point to workspace tokens.

Theme choice (dark/light/system) and sidebar collapse are stored only in this
browser. System theme follows OS changes. Theme initialization runs before
hydration; client controls load the same saved preference.

The shared sidebar has collapsible desktop navigation and a mobile drawer with
focus containment, Escape dismissal and focus restoration. Its search icon opens
the existing command palette. Projects, chat history, Files and Kanban remain
functional. The app root opens the assistant; login is a minimal centered form,
without demo credentials or placeholder social-auth buttons.

The composer uses the existing engines: Assistant and Hermes. It does not pretend
to offer Grok models, voice, Imagine or paid features. Dropdowns support keyboard
navigation and focus restoration. The plus menu opens Files or uploads files into
the selected project's document service; dropping files uses that same service.
Uploads are project documents, not transient per-message attachments. Backend
validation and project authorization remain authoritative. Partial upload failure
shows the number already saved. Switching projects prevents stale upload notices
from appearing in a different project. Uploading does not mean processing is done.

## Verification

Frontend lint, TypeScript, production build and local browser verification.
Browsers covered dark/light persistence, sidebar collapse persistence, keyboard
engine selection, existing conversations, mobile menus and Escape behavior,
search palette, task editor, Files, and sign-in styling. Composer uploads were
verified against the isolated develop backend, and both temporary test documents
were deleted through Files; a scoped API read confirmed zero remain. No model
request or user-content deletion was needed. Mobile page width equals its 390px
viewport. AIW accepted-decision lookup returned no records. No assigned task was
supplied or marked complete.

## Reference sizing refinement

The supplied side-by-side captures showed 125% display scaling: the former 320px
CSS sidebar appeared 400px wide, while the reference was 320 display pixels.
The sidebar is now 256 CSS pixels, with 36px desktop rows, 16px row icons and
13px labels. The composer is 752 CSS pixels. Overview is removed from primary
navigation; Search is available through the header icon and command palette.
Project administration remains accessible through Settings. At a 1534x732 CSS
viewport, browser measurement confirms 256px sidebar width, 236x36px rows and
zero Overview navigation links. Mobile keeps 40px rows and 40px minimum input
height. Unrelated in-progress Settings and Team work is preserved separately.

## Project and chat workflows (2026-10-16)

The supplied signed-in references guide project creation, nested chats, menus,
icons, and the settings/files panel. Files remains the full library; the chat
panel offers the same project documents and private folder copies without leaving
work in progress. No Drive, Box, automation, or public-share controls are shown
without an implemented integration.

- Projects and Chats collapse independently. Selecting a project opens its chats;
  the plus button starts a scoped draft. Chat at the top starts general chat.
- Create Project needs a name; keys are generated. Add accepts files or a browser
  folder selection. Documents upload after creation; a folder uses the existing
  resumable folder uploader. A failed file upload retries the remaining files
  against the same created project.
- Project menus expose Rename, Share, Edit icon, Settings, and Archive. Sharing
  opens real project membership controls. Owners can archive and restore; managers
  can edit preferences. Archive replaces destructive project deletion.
- Settings and Files open beside chat on desktop and in a focus-contained overlay
  on mobile. Escape closes the panel. The composer project chip opens Files.
- Instructions and emoji icons persist on the project. Instructions reach both
  Assistant and Hermes as preferences, subordinate to evidence/access/review rules.
- Chat menus support rename, pin/unpin, and confirmed deletion. Pins and titles
  persist on the server; project membership never makes private chats public.
- Metadata refreshes preserve the current draft. Unsaved drafts are session-only;
  project switching keeps them separate. A page reload does not save drafts.

Backend migration: `1792368000000-ProjectWorkspacePreferences`. The backend's
`docs/PROJECT_CHAT.md` documents the metadata API and authorization boundaries.

Verified locally: frontend lint/typecheck/production build, eight existing folder
checks, desktop/mobile browser workflows, document/folder creation and upload,
chat rename/pin after reload, instruction save without losing the draft, project
rename/icon, sharing, and archive/restore. Three synthetic QA projects and their
stored files were removed after verification. No live AI calls were needed for
these UI checks. Main and deployment configuration remain unchanged.

## Search and supporting pages (2026-10-16)

Chat search lives in the top sidebar magnifying-glass icon, beside the collapse
control, with Ctrl/Cmd+K. Its compact dialog searches the current user's saved
conversation titles and opens the selected thread. It does not mix documents or
project records into chat results. Keyboard navigation, Enter and Escape work in
both expanded and collapsed navigation.

The separate **Global search** sidebar item opens `/search`, the existing project
information search for documents, tasks, decisions and other records. Its project
selection and detailed matching options remain available. These are distinct
entry points, matching the user's clarified intent.

Removed the old global navbar, search strip, project switcher and inbox entry.
A mobile navigation button remains. Chat project/memory controls are compact.
Decisions uses the same typography, restrained controls and table treatment;
mobile rows prioritize the decision itself. Team has no summary statistic cards,
and its directory/invitation controls use the shared styling.

Settings now owns the integration console directly, including Hermes, GitHub and
MCP configuration. `/integrations` and `/settings/integrations` render that Settings
shell; they no longer show another app layout or redirect to a separate console.
The existing Settings and Team implementation is included as part of this change.
Mobile Settings uses a compact section selector rather than a full navigation rail.

Verification: frontend lint, TypeScript and production build; browser checks for
sidebar search, saved-chat opening, responsive Decisions/Team, embedded integration
navigation and mobile search. No backend contracts, credentials or database
configuration changed. AIW accepted-decision lookup returned none; no task assigned.
Local develop only, without pushing or deploying.

## Public chat entry (2026-10-16)

The root route opens the minimal chat canvas from the supplied signed-out
reference, with appearance, Sign in and Sign up controls. There is no marketing
landing page or automatic login-form redirect. An unauthenticated visit to
`/assistant` returns to this entry canvas; other protected routes retain their
authentication checks. Authenticated root visitors continue to their workspace.

A visitor can draft a message. Sending or adding files opens sign-in; Sign up
opens the existing registration form. No anonymous model or file access is added.
The draft is kept in session storage during that transition, restored to the
signed-in composer, and removed from storage after handoff. It is never sent
automatically. Appearance uses the existing theme controls.

Verified with frontend lint, TypeScript and production build, plus anonymous
desktop/mobile browser checks, both auth-form entry paths, authenticated root
routing, unsent draft restoration/storage removal, and the unauthenticated
assistant redirect. Temporary QA drafts were cleared. Local develop only.

## Final navigation alignment

Settings preserves the selected section in its URL for reloads, rejects unsigned
access, closes back to chat, and lets nested dialogs handle Escape before closing
the settings shell. The legacy Team URL uses the same Settings shell. Old dashboard
links resolve to chat. Loading screens no longer show management cards/header
placeholders. Global search no longer suggests hardcoded software-engineering demo
queries. Task Kanban, project files, decisions, memory and Hermes remain available.

The clarified search split is the current design: chat-only top icon / Ctrl+K,
separate Global search sidebar link for document and project-record searching.

Cleanup verification: lint, TypeScript, formatting and production build passed.
Browser checks covered both search entry points, collapsed sidebar controls,
actual project-record search with an empty result, Settings section reload,
unsigned Settings access and the task Kanban screen. No browser errors were
reported in that pass. No backend contract or deployment configuration changed.

## Project controls refinement

The sidebar is the project selector. Chat no longer repeats an All Projects
selector in its header. The Chats heading has a plus button for a new standalone
conversation; each project retains its own new-chat action. Chat search at the top
and the Global search navigation entry remain distinct.

Project menus contain Rename, Settings, and Archive. Icon editing is in project
settings. The narrower settings panel focuses on identity and instructions with
explicit save feedback; repeated Tasks and Sharing links were removed. Files
remain available through the panel and sidebar, and membership management remains
in the existing project administration screen. Existing backend role checks,
version checks, instruction limits, and archive/restore behavior are retained.

The guest appearance popover fits mobile viewports and closes on outside clicks.

Verified with lint, TypeScript, formatting, and production build. Browser checks
covered the trimmed menu, both new-chat contexts, saving instructions and reload
persistence (temporary text restored), desktop/mobile layout, and appearance
popover dismissal. No browser errors were reported. Backend readiness passed.

## Quiet sidebar actions

Project and chat actions use 14px SVG glyphs and compact buttons. Section actions
and row controls appear on hover or keyboard focus; open menu triggers stay
visible. Touch devices retain visible controls. Sidebar project/chat renames are
inline, with explicit Save/Cancel, Enter/Escape, pending/error feedback, and the
existing API limits. Project settings retains its rename dialog. Chat menus can
open an existing conversation in a new tab through the supported deep link.

Verified with TypeScript, lint, formatting, and browser checks for idle/hover/focus
visibility, inline project/chat saves, cancelling a draft, and opening the correct
conversation in a new tab. Existing names were retained. No browser errors.

## Memory personalization

Settings > Personalization now manages private project memory inline, including
reviewed additions, edits, and confirmed removal. The project selector makes the
existing backend scope explicit. No global memory preference or toggle is implied.
Remember on a saved assistant reply opens an unsaved draft in this section; closing
Settings returns to the source conversation. Drafts stay in React state, are tied
to the current user/project, and are never saved automatically.

Project settings and instructions remain in their existing side panel, reached
from the project's menu. The redundant project-settings and memory icons are
removed from the chat header. Files remain accessible from the composer/sidebar.

Verified lint and TypeScript, desktop/mobile rendering, Settings section reload,
project-menu settings access, Remember draft review/cancel and return to its
conversation, and saving/reloading/removing a temporary private memory. The
temporary entry was removed. No browser errors were reported.
Production build passed after the final changes.


### 2026-10-17 — Sidebar scope and global search

- Tasks and Decisions follow the selected sidebar project without duplicate project filters. All projects clears that selection and shows combined project items; individual items still belong to a project. Creation retains a project choice in the combined view.
- Sidebar project selection stays on Tasks, Decisions, or Global search when already on those pages. Other project selection continues to open chat. The selection persists through navigation/reload.
- Global search ignores sidebar scope. It reuses authenticated project search endpoints for every accessible active project, with four concurrent requests at most, source-project labels, summed facets, additional pages, request-race protection, and explicit partial-failure notices. Opening a result sets its owning project before navigation.
- `pnpm test:global-search` verifies cross-project aggregation, bounded concurrency, source attribution, counts, pagination, deduplication, and partial failures. No backend schema/API changes are required.


### 2026-10-17 — Continuum infinity identity

- Original monochrome infinity ribbon, tilted 26 degrees, with tapered tips and an open crossing. The reference contributes the minimal orbital feel; the geometry is Continuum's infinity symbol.
- Shared vector geometry in `src/lib/continuum-brand.ts` supplies sidebar, guest, login, and reusable logo marks. App SVG and ICO use the same path, with an export at `public/brand/continuum-mark.svg`.
- The logo inherits interface color for light/dark themes. Checked the large mark, sidebar size, and 64px app tile; TypeScript and lint pass.


### 2026-10-17 — Brand asset audit and cached icons

- Audited sidebar, guest chat, login, invite, retained landing components, and static icon assets: all logo placements use the Continuum infinity geometry. Integration/vendor icons remain their own identities.
- Versioned favicon, SVG icon, and Apple icon URLs to refresh previously cached browser branding. Added a 180px PNG Apple home-screen icon rather than advertising an SVG for that slot. Removed the remaining Grok name from user-facing appearance copy.


### 2026-10-17 — Project row alignment and standalone chat scope

- All projects and individual project rows share the same sidebar row wrapper, 44px height, icon position, and label inset. Browser measurements confirmed both labels start at x=57px at the tested desktop width.
- New standalone chats save `includeAllWorkspaces: true` in conversation metadata. Browser-only legacy tags are imported to the server; citation heuristics no longer infer a chat's scope. Reopening a standalone chat clears sidebar project selection and restores the All projects composer label.
- Project folders contain project-scoped chats; the root Chats list contains standalone chats and pinned chats. Backend retrieval uses the saved all-project scope on subsequent turns, preserving actor authorization. Private storage/memory/history and Hermes remain project-scoped internally.
- Verified TypeScript/lint, desktop layout, real authenticated create/read/reopen scope persistence and root history placement. Temporary QA conversation removed. Backend migration and regression verification are recorded in its implementation guide.


### 2026-10-17 — Knowledge Graph preview

- Added Knowledge to the sidebar with a Coming soon badge and a consistent node-link icon. Opens `/knowledge` with a clearly labeled Coming soon page describing future source-backed connections.
- Available without selecting a project. This is an announced placeholder; no graph data, agent introspection, graph APIs, or extraction behavior is claimed or implemented.
- Verified desktop/mobile layout, TypeScript, lint, and direct authenticated page navigation.


### 2026-10-17 — Files workspace refinement

- Replaced the dashboard breadcrumb/oversized heading with a compact Files header, neutral surfaces, a consistent upload action, quieter folder rows, and a responsive file toolbar. The list view is the default; grid/list preference persists locally.
- Files follows sidebar project selection. All projects opens uploaded documents across projects; folder copies remain explicitly project-scoped with a sidebar-selection hint. Uploading from All projects now shows the destination project rather than silently choosing it.
- Preserved upload, download, revisions, folder resume, preview, and deletion handlers. Added clear-filter empty states, visible load failures with retry, stale-response protection, and keyboard entry points for file cards and the upload dropzone.
- Verification: TypeScript/lint and eight folder regression tests passed. Desktop/mobile folder layouts and existing folder expansion were checked. Upload dialog project choice, search reset, and view persistence are verified in the final manual pass. No user files were created, changed, or deleted by this refinement.

### 2026-10-17 — Assistant answer presentation

- Replaced the line-by-line renderer with pinned react-markdown 10.1.0 and remark-gfm 4.0.1. Answers now use semantic paragraphs, headings, nested/ordered/task lists, tables, and code fences, including incomplete fences. Raw HTML, unsafe/local URLs, and automatic remote images are not enabled.
- Consolidated answer styles for chat and agent artifacts: 752px chat column, restrained headings, 16px prose, neutral list markers, paragraph spacing, and contained table/code overflow. Sources remains a disclosure; Copy and Remember share a quiet action row.
- Compact inline evidence numbers resolve against the response citation metadata and open the existing authenticated source inspector. Missing citation records remain visibly non-interactive; code literals are not converted to source controls.
- Four renderer regression tests cover semantic structure, incomplete code, citation mapping (including legacy numbering), and unsafe content. TypeScript/lint and the twelve existing search/folder tests passed. Desktop/mobile and light/dark layouts, contained horizontal overflow, an existing chat's source inspector, and simulated clipboard success/failure were checked in-browser. A temporary sample route used for layout checks was removed.
- Backend style instructions were updated separately to favor direct answers and connected prose, with sections/lists/tables only when useful. Stored replies retain their original wording and receive the new presentation on display.
- Final verification: frontend production build passed; the sample route is absent from the production route list. Local API and frontend were rebuilt/restarted after restoring the existing Docker development database. No remote push or deployment was performed.

### 2026-10-18 — Chat/context/files acceptance and recovery

- Normal chat sends retain a request UUID across transport retries and use persisted request metadata when retrying a failed or unanswered latest turn after reload. Saved response IDs replace optimistic/previous copies rather than appending duplicates. A failed answer restores the draft with an explicit recovery message. Edited text/mode and completed turns create a new send intent.
- Live all-project output exposed workspace annotations inside evidence markers (for example `[Evidence #1, QAR66E36]`). Marker parsing now accepts these annotations, extracts only numeric source entries, and opens the correct existing inspector without treating project-key digits as source numbers.
- Real local acceptance: uploaded/indexed two synthetic text files; global search found both despite a selected project; a project chat returned only its project's code; a standalone chat returned both with source attribution. An intentionally dropped successful response recovered on resend with one saved/user answer pair. Hermes polling outage/recovery preserved composer availability. Test fixtures and their exact uploaded files were removed afterward.
- Automated checks cover request reconciliation/reload identity, Markdown and citation safety, global search, and folder behavior. Backend migration/retry tests are recorded in its implementation guide. QA report/screenshots/video are local at `C:/Users/User/.codex/testing/continuum-reliability-20261018`.
- Final checks: 19 frontend regression tests and the production build passed. Changes are committed locally on develop; no push or deployment. The local app uses the verified additive chat-request migration.
