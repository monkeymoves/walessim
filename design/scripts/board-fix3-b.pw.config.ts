// Playwright for package B's fix round 3 checks against a preview on port 4391 (npx vite preview --outDir <dir> --port 4391).
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../../tests/e2e",
  timeout: 120_000,
  use: { baseURL: "http://localhost:4391", viewport: { width: 1440, height: 900 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
