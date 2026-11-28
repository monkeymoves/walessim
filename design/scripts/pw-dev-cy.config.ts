// Runs tests/e2e/board-cy.spec.ts against a running dev server (the Welsh pass, fix round 2).
// Usage: npx vite --port 4471 --strictPort --host 127.0.0.1, then npx playwright test -c design/scripts/pw-dev-cy.config.ts board-cy
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../../tests/e2e",
  timeout: 600_000,
  use: { baseURL: "http://127.0.0.1:4471", viewport: { width: 1440, height: 900 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
