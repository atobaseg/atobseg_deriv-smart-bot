---
name: Deriv tick pip_size type
description: The pip_size field on live Deriv tick WebSocket messages can be a number, not a string, despite docs/schema suggesting string.
---

When subscribing to `ticks` on the Deriv WebSocket API and reading `tick.pip_size` to determine decimal precision (needed to extract the last digit of a quote for digit-contract strategies), the field can arrive as a JS `number` at runtime even though the public schema/docs describe it as a string like `"0.01"`.

**Why:** Calling `.includes(".")` directly on `tick.pip_size` crashed the process with `TypeError: pipSize.includes is not a function` the first time a real tick came in (only caught by live-testing against the real API, not by typechecking against the docs-derived shape).

**How to apply:** Always `String(tick.pip_size)` (or otherwise coerce) before doing string operations on fields documented as "string" in third-party real-time API payloads — treat the documented type as a hint, not a guarantee, and verify against a live message before trusting it in a hot path.
