---
name: Orval client import path
description: Generated API client packages in this workspace must be imported from their package root, not their internal generated file path.
---

In this pnpm workspace, `lib/api-client-react` (and similarly `lib/api-zod`) re-export everything through `src/index.ts`, and the package's `exports` map only exposes `"."` → `./src/index.ts`.

**Why:** A design subagent building a frontend imported hooks/types directly from `@workspace/api-client-react/src/generated/api` (and `.../api.schemas`). That subpath isn't in the package's `exports` map, so Vite's dependency scanner failed immediately with "Missing './src/generated/api' specifier", breaking the whole dev server before any page could load.

**How to apply:** When briefing a subagent (or writing frontend code yourself) to consume generated OpenAPI hooks/schemas, always import from the bare package name (e.g. `@workspace/api-client-react`), never an internal `/src/generated/...` path — even if that path exists on disk, it isn't a public entry point.
