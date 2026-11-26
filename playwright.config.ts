import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: { baseURL: "http://localhost:4174", viewport: { width: 1440, height: 900 } },
  webServer: { command: "npx vite preview --port 4174 --strictPort", port: 4174, reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
