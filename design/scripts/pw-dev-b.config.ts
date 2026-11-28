// Runs one e2e spec against an already running dev server (BASE), for package checks without a build.
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../../tests/e2e",
  timeout: 180_000,
  use: { baseURL: process.env.BASE ?? "http://127.0.0.1:4393" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
