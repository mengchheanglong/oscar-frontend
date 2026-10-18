# Current Continuum features — 2026-10-18

The workspace uses Chat, Global search, Decisions, Tasks, Files, and Knowledge
(coming soon). Project scope comes from the sidebar. Global search always covers
all accessible projects; standalone chat keeps its all-project context.

Meetings and Requirements have been removed, including pages, search filters,
decision linkage UI, citation detail fetches, API client methods, and meeting
analysis review UI. Decision task proposals still support editing, assignment,
explicit confirmation, and retry identity. Old chat text is preserved, with a
clear unavailable message for retired source citations.

The duplicate project list/detail interfaces are consolidated into current
Settings and the project side panel. `/projects` redirects to Settings → Projects;
`/projects/[id]` opens that project's existing settings panel. Project membership
management remains under Settings → Projects → Project access. New-project
actions open the existing creation dialog. `/dashboard` and `/users` retain their
small compatibility redirects to Chat and Team settings.

Verified: lint, TypeScript, all 19 regression tests, production build, and local
browser checks for sidebar settings, old project links, and project access.
Backend retirement and data-preservation checks are recorded in that repository's
`docs/FEATURE_RETIREMENT.md`. No migrations or user data were deleted.
