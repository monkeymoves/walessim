# 0001: Vite, TypeScript and Solid 1.9

*26 November 2026. Accepted.*

**Context.** Luke considered Solid 2.0. Solid 2.0.0 went stable on 17 November 2026 (2.0.4 on 25 November), but the Vite plugin that supports it (`@solidjs/vite-plugin`) is still a pre-release (3.0.0-next), and the build runs overnight with several agents whose knowledge of the 2.0 APIs is thin.

**Decision.** Vite 8, TypeScript, Solid 1.9 (`solid-js@1.9`, `vite-plugin-solid@2.11`). The engine and model loader are plain TypeScript with no framework imports, so the UI layer can move to Solid 2.0 later without touching the simulation.

**Consequences.** Stable tooling tonight. A later migration to Solid 2.0 is a UI-only change, worth doing once its plugin is stable.
