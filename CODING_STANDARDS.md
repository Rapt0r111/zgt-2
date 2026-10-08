# Coding standards

Each bullet names the file it was checked against. Where the code does not follow a
convention, that is not written here as a rule.

## Editing proxy.ts
- Exports `proxy(request)` and `config.matcher`. The matcher skips `login`, `api/auth`, `_next/static`, `_next/image` and `favicon.ico`. (proxy.ts)
- Only checks that a cookie named `better-auth.session_token` exists, or any cookie starting with `better-auth.`. It does not validate the session. (proxy.ts)
- Redirects to `/login?callbackUrl=<pathname>` when that cookie is missing. (proxy.ts)
- Sets an `x-request-id` header on the response. (proxy.ts)

## Auth and roles
- Role priority: admin 100, officer 50, operator 20, user 10. `requireRole(minRole)` throws `Unauthorized` or `Forbidden`. (lib/auth.server.ts)
- `getCurrentUser` is wrapped in React `cache`. It returns null for accounts with `isActive === false`. (lib/auth.server.ts)
- Login email is `<username>@zgt.local`. The login form appends the suffix. (lib/auth.server.ts, app/(auth)/login/LoginForm.tsx)
- Sessions last 8 hours. Cookies are httpOnly and sameSite strict. (lib/auth.server.ts)
- The dashboard layout redirects to `/login` when there is no user. The login page redirects to `/` when there is one. (app/(dashboard)/layout.tsx, app/(auth)/login/page.tsx)

## Adding a server action
- Exported mutations live in `lib/actions/*.ts`, which start with `"use server"`. (lib/actions/*.ts)
- Each export calls `requireRole(...)` before any DB work. All 19 exports do this. (lib/actions/batch.ts, equipment.ts, export.ts, personnel.ts)
- Roles used: operator for writes, admin for delete and restore, officer for personnel export. (lib/actions/personnel.ts lines 37, 146, 179; lib/actions/export.ts line 61)
- Input is checked with a zod `safeParse` before any write. (lib/actions/batch.ts, equipment.ts, personnel.ts)
- Return `{ success, error }`. A `Forbidden` error maps to a Russian message. (lib/actions/personnel.ts lines 74-77)

## Adding an API route
- Route handlers are `app/api/**/route.ts`. Apart from the better-auth catch-all, they export GET only. (app/api/**/route.ts)
- Authenticated routes call `getCurrentUser()` and return JSON 401 when it is null. (app/api/search/route.ts, app/api/personnel/search/route.ts, app/api/personnel/[id]/route.ts, app/api/equipment/[id]/route.ts)
- Dynamic params are typed `Promise<{ id: string }>` and must be awaited. (app/api/equipment/[id]/route.ts)
- UUID path params are checked with `z.string().uuid()` and return 400 when invalid. (app/api/equipment/[id]/route.ts)
- `/api/health` is public. It returns 503 when the DB check fails. (app/api/health/route.ts)

## Adding a server helper in lib
- Query helpers are `lib/<feature>.server.ts`, and each starts with `import "server-only"`. (lib/auth.server.ts, equipment.server.ts, personnel.server.ts, search.server.ts)
- Server Components call helpers directly. Client components call `/api/*` routes or server actions. (app/(dashboard)/search/page.tsx, app/(dashboard)/equipment/_components/EquipmentFormDrawer.tsx)
- The DB client is `db/index.ts`. `db/` has no `*.server.ts` files. (db/index.ts)

## Adding a dashboard feature
- Pages are `app/(dashboard)/<feature>/page.tsx` with a default export and a `metadata` export. (app/(dashboard)/search/page.tsx)
- Feature-only components go in `<feature>/_components/`. 14 of the 19 files there start with `"use client"`. The rest are server components. (app/(dashboard)/equipment/_components/, app/(dashboard)/personnel/_components/)
- Nav entries are the `NAV_ITEMS` array in the dashboard layout. Each has a `minRole`. (app/(dashboard)/layout.tsx)
- UI strings are in Russian. 62 source files contain Cyrillic. (app/(dashboard)/layout.tsx, lib/actions/personnel.ts)

## Changing next.config.ts
- `output: "standalone"`. The Dockerfile copies `.next/standalone`. (next.config.ts, Dockerfile)
- `typedRoutes: true` and `reactCompiler: true`. `babel-plugin-react-compiler` is a devDependency. (next.config.ts, package.json)
- `typescript.ignoreBuildErrors` is `false`, so type errors fail the build. (next.config.ts)
- Security headers and the CSP are set in `headers()` for `/(.*)`. (next.config.ts)

## Changing TypeScript or lint config
- `strict: true`. `@/*` maps to the repo root. (tsconfig.json)
- ESLint flat config uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Run `bun run lint`. (eslint.config.mjs, package.json)

## Changing the database schema
- The schema source is `db/schema/index.ts`. drizzle-kit reads it and writes to `drizzle/`. (drizzle.config.ts)
- Auth tables (`user`, `session`, `account`, `verification`) use text IDs and singular names, to match better-auth. (db/schema/index.ts, lib/auth.server.ts)
- App tables use uuid PKs. `createdBy` columns hold `user.id` as text. (db/schema/index.ts)
- Soft delete uses `deletedAt` on personnel, phones, equipment, storage devices and storage items. (db/schema/index.ts)
- `search_vector` (tsvector with GIN index) is written by app code through `refreshSearchVector` and `refreshEquipmentSearchVector`. No DB trigger exists. (lib/personnel.server.ts, lib/equipment.server.ts, drizzle/0000_material_molly_hayes.sql)
- `drizzle/meta/_journal.json` lists one migration, `0000_material_molly_hayes`. (drizzle/meta/_journal.json)
- The DB pool is created once on `globalThis`, with max 10. SSL is on only when `DATABASE_SSL=true`. (db/index.ts)

## Installing dependencies and Docker
- Package manager is bun. `bun.lock` is committed. (bun.lock, Dockerfile)
- The deps stage runs `bun install --frozen-lockfile`. (Dockerfile)
- The runtime image is `node:22-alpine`. Its CMD runs `node scripts/migrate.js && node server.js`. (Dockerfile)
- drizzle-kit runs under Node and loads `.env.local` itself. (drizzle.config.ts)
- Postgres is `postgres:17-alpine`, bound to 127.0.0.1:5432. The app port comes from `APP_PORT`, default 3000. (docker-compose.yml)

## Environment variables
- Code reads `DATABASE_URL`, `DATABASE_SSL`, `NODE_ENV` and `APP_VERSION`. (db/index.ts, lib/auth.server.ts, app/api/health/route.ts)
- `.env*` files are gitignored. (.gitignore)

## Testing
- The repo has no test files, no test runner and no test script. Scripts are `dev`, `build`, `start` and `lint` only. (package.json, repo file list)
