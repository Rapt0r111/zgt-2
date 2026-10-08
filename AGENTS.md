<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project index

Read only the CODING_STANDARDS.md section whose trigger matches your task.

- Editing proxy.ts or session cookies → CODING_STANDARDS.md#editing-proxyts
- Changing login, roles or getCurrentUser → CODING_STANDARDS.md#auth-and-roles
- Adding or changing a server action in lib/actions → CODING_STANDARDS.md#adding-a-server-action
- Adding or changing an API route in app/api → CODING_STANDARDS.md#adding-an-api-route
- Adding a lib/*.server.ts helper → CODING_STANDARDS.md#adding-a-server-helper-in-lib
- Adding a dashboard page or component → CODING_STANDARDS.md#adding-a-dashboard-feature
- Changing next.config.ts, headers or CSP → CODING_STANDARDS.md#changing-nextconfigts
- Changing tsconfig or ESLint → CODING_STANDARDS.md#changing-typescript-or-lint-config
- Changing db/schema, drizzle.config.ts or drizzle/ → CODING_STANDARDS.md#changing-the-database-schema
- Changing Dockerfile, docker-compose.yml or dependencies → CODING_STANDARDS.md#installing-dependencies-and-docker
- Reading or adding environment variables → CODING_STANDARDS.md#environment-variables
- Running or adding tests → CODING_STANDARDS.md#testing
