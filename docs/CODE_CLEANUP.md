# Code cleanup — 2026-10-18

Removed 27 unused files: the disconnected landing page components, Magic UI
animation helpers, obsolete agent/folder/notification panels, unused UI wrappers,
two unreferenced font files, and the redundant public-directory placeholder.
Removed the three resulting empty directories and landing-only animation CSS.

Removed four unused direct dependencies (`@base-ui/react`, `framer-motion`, `cn`,
and `shadcn`) and refreshed the pnpm lockfile. Cleaned unused imports, helpers,
state, and requests in active pages. The linked project-detail route remains;
its ownership-transfer and activity buttons were removed because neither opened
a working interface. Project editing, archiving, and membership controls remain.

The audit followed TypeScript imports from all App Router files, tests, and
configuration entrypoints, checked assets/config references, and retained
implicit framework/runtime dependencies. No remaining source files were
unreachable by that audit. This is a static reachability check, not proof that
every reachable feature is used by every user. `noUnusedLocals` now prevents
unused imports and local declarations from accumulating again.

Verification: frontend lint, TypeScript checking, all 19 regression tests, and
production build passed. Backend cleanup separately passed lint, typecheck,
formatting, build, 355 unit tests, 156 HTTP tests, and 80 PostgreSQL integration
tests using the isolated test database on port 55433. No migrations, user data,
uploads, credentials, or operational scripts were removed.
