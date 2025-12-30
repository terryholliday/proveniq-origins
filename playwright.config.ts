import { defineConfig } from '@playwright/test'
import path from 'path'

const isCi = !!process.env.CI

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !isCi,
      cwd: path.resolve(__dirname),
    },
    {
      command: 'npm run dev -- --host 0.0.0.0 --port 5173',
      port: 5173,
      reuseExistingServer: !isCi,
      cwd: path.resolve(__dirname, 'client'),
    },
  ],
})
