-- Every signed word from Whop, kept as received. Replays are no-ops on the id.
CREATE TABLE IF NOT EXISTS money_events (
  id TEXT PRIMARY KEY,          -- webhook-id
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS money_events_type ON money_events (type, received_at);
