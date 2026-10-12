-- The nightly report: D1 copy vs each lot's object, and the Whop balance vs the
-- deposits held. The growth-plan gate reads "equal" seven nights running.
CREATE TABLE IF NOT EXISTS reconciliations (
  id TEXT PRIMARY KEY,
  ran_at INTEGER NOT NULL,
  lots_checked INTEGER NOT NULL,
  lots_differing INTEGER NOT NULL,
  differing TEXT NOT NULL,          -- JSON array of lot ids whose copy differed from the object
  deposits_held INTEGER NOT NULL,   -- buyers with deposit_status 'captured'
  whop_balance_cents INTEGER,       -- NULL when Whop is not configured or the read failed
  equal INTEGER NOT NULL,           -- 1 when no lot differed and the balance covers every deposit held
  note TEXT
);
CREATE INDEX IF NOT EXISTS reconciliations_ran ON reconciliations (ran_at);
