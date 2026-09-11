// TEMPORARY (M-script private dev server on :3742) — deleted before the report.
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL: 'http://localhost:3742' },
});
