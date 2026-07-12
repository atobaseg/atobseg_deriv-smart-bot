---
name: Account-type token selection pattern
description: Pattern for letting a user pick demo/real (or similar) account mode in the UI while the backend picks the matching secret dynamically, without silent fallback.
---

When a trading/finance-style backend needs to support both a demo and a real-money account, and the user should be able to switch between them from the UI:

- Store `accountType: 'demo' | 'real'` in the mutable config, not as a build-time flag.
- At the moment of use (e.g. engine start), map `accountType` to the corresponding secret name (`DERIV_DEMO_TOKEN` / `DERIV_REAL_TOKEN`) and read it then — not at startup — so a later-added secret is picked up without a restart.
- If the secret for the selected mode is missing, fail loudly with a specific error naming the missing secret (e.g. "DERIV_REAL_TOKEN is not configured"). Never fall back to the other mode's token.

**Why:** Silently trading on the wrong account (e.g. falling back to demo when the user explicitly selected real, or vice versa) is a correctness/safety issue for financial actions — the user must get a clear, actionable error instead.

**How to apply:** Any feature with a "test/sandbox vs live" account switch and per-mode credentials should use this pattern: mode stored in request-time config, secret resolved per-request by mode, explicit error (never fallback) when the resolved secret is absent.
