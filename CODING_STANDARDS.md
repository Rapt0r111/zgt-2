# Coding standards

Only rules an agent would get wrong without them, and that the code follows today.
Each bullet names the file it was checked against.

## Editing proxy.ts
- proxy.ts only checks that a `better-auth.*` cookie exists. It does not validate the session, so it is not authorization. Each action and route checks for itself. (proxy.ts)

## Adding a server action or API route
- Each exported function in `lib/actions/*.ts` calls `requireRole(...)` before any DB work. All 19 do. (lib/actions/batch.ts, equipment.ts, export.ts, personnel.ts)
- Writes need at least `operator`. Delete and restore need `admin`. The personnel export needs `officer`. (lib/actions/personnel.ts, equipment.ts, export.ts)
- The four data GET routes call `getCurrentUser()` and return 401 when it is null. They check the session, not the role. (app/api/search/route.ts, app/api/personnel/search/route.ts, app/api/personnel/[id]/route.ts, app/api/equipment/[id]/route.ts)
- Get the user with `getCurrentUser()` or `requireRole()`, not `auth.api.getSession`. Only `getCurrentUser` treats `isActive === false` as signed out. (lib/auth.server.ts)
- Route handlers export `GET` only, apart from the better-auth catch-all. Mutations are server actions. (app/api/**/route.ts)

## Changing next.config.ts
- The CSP in `headers()` lists no external origins. Add any external script, style, font, image or connection origin there, or the browser blocks it. (next.config.ts)

## Changing the database schema
- Deletes are soft. Set `deletedAt` and never hard-delete. Every read filters on it. (db/schema/index.ts, lib/personnel.server.ts, lib/equipment.server.ts, lib/search.server.ts)

## Adding a dashboard page or component
- UI text is Russian. The only Latin text is format names such as "Excel" and input placeholders. (app/(dashboard)/layout.tsx, app/(dashboard)/equipment/_components/EquipmentForm.tsx)

## Changing login or users
- Usernames are stored as `<username>@zgt.local`. The login form and scripts/seed.ts append the suffix, so code that creates a user must do the same. (lib/auth.server.ts, app/(auth)/login/LoginForm.tsx, scripts/seed.ts)
