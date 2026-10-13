-- Not a migration: wrangler applies only the numbered files one level up, never this folder.
-- The two names the app's fixtures sign in with (auction/src/store.ts) can reach buyers.name from a demo or walkthrough
-- run against a deployed Worker. A real dealer must never see either on a Sold card or in sale.contact.
-- Run once, before the first real buyer signs in, against the production database:
--   npx wrangler d1 execute obavia-auction --remote --file migrations/notes/clear-demo-names.sql
-- Check first what it will touch:
--   SELECT id, name FROM buyers WHERE name IN ('Marisol Treviño','Maximiliano Echeverría-Ortiz');
UPDATE buyers SET name = NULL WHERE name IN ('Marisol Treviño','Maximiliano Echeverría-Ortiz');
