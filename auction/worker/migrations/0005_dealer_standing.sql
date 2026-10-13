-- Dealer standing: a flag the owner flips (collateral.md §6). Null is in good standing.
ALTER TABLE dealers ADD COLUMN suspended_at INTEGER;
