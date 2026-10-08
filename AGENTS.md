<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Read only the CODING_STANDARDS.md section whose trigger matches your task:

- Editing proxy.ts or session cookies → CODING_STANDARDS.md#editing-proxyts
- Adding a server action or API route → CODING_STANDARDS.md#adding-a-server-action-or-api-route
- Changing next.config.ts or CSP headers → CODING_STANDARDS.md#changing-nextconfigts
- Changing db/schema or any query that reads or deletes rows → CODING_STANDARDS.md#changing-the-database-schema
- Adding a dashboard page or component → CODING_STANDARDS.md#adding-a-dashboard-page-or-component
- Changing login or creating users → CODING_STANDARDS.md#changing-login-or-users
