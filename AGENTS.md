# Continuum workflow

- Work only on `develop`. Reconcile newer `main` changes into `develop`; do not commit or merge into `main`.
- Commit completed, verified changes locally. Do not push unless the user explicitly requests it.

- Local manual testing uses the frontend on port 3002, backend on port 3001, and isolated `oscar` database on `127.0.0.1:55432`. Do not connect the local testing UI to the deployment API/database. Keep credentials and machine-local MCP configuration untracked.

- Use the `ai-workspace` MCP server for project `AIW`.
- Before making design changes, call `list_decisions` for `AIW`, filter for accepted decisions, and consult the relevant details with `get_decision`.
- When an assigned task is completed and verified, call `update_task_status` for that task in `AIW` with status `DONE`. Do not mark unverified work complete.
- Keep personal access tokens out of tracked files and tool output. The project MCP configuration forwards `AI_WORKSPACE_API_KEY` from the local environment.
- If the MCP server or authentication is unavailable, report the blocker instead of claiming that decisions were consulted or a task was updated.

## Continuum repository split

- This checkout belongs to Continuum. Keep the original AI Workspace repositories
  separate; do not push Continuum changes to their remotes.
- The user's 2026-10-17 request authorizes the initial private Continuum repository
  creation and initial develop push. Future pushes still require user direction.
- The original AIW implementation guide and MCP project are inherited references;
  do not rename existing user project records or database identifiers as part of
  product branding. Report MCP unavailability honestly.
