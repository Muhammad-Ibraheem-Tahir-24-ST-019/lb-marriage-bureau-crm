import { defineConfig } from "@playwright/test";
export default defineConfig({
    testDir: "./tests/browser",
    workers: 1,
    use: {
        baseURL: "http://127.0.0.1:8080",
        viewport: { width: 1440, height: 1050 },
        trace: "retain-on-failure",
    },
    reporter: "list",
    timeout: 45000,
});
