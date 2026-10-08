# AI Workspace workflow

- Work only on `develop`. Reconcile newer `main` changes into `develop`; do not commit or merge into `main`.
- Commit completed, verified changes locally. Do not push unless the user explicitly requests it.

- Use the `ai-workspace` MCP server for project `AIW`.
- Before making design changes, call `list_decisions` for `AIW`, filter for accepted decisions, and consult the relevant details with `get_decision`.
- When an assigned task is completed and verified, call `update_task_status` for that task in `AIW` with status `DONE`. Do not mark unverified work complete.
- Keep personal access tokens out of tracked files and tool output. The project MCP configuration forwards `AI_WORKSPACE_API_KEY` from the local environment.
- If the MCP server or authentication is unavailable, report the blocker instead of claiming that decisions were consulted or a task was updated.
