-- Who may bid (decisions §9 D10, D11, D15).
-- D10: the auction terms the buyer accepted with the first bid ever, and when.
ALTER TABLE buyers ADD COLUMN terms_version TEXT;
ALTER TABLE buyers ADD COLUMN terms_at INTEGER;
-- D11: what the shill check compares against the lot's dealer. Both are what the
-- buyer typed at sign-in; neither is verified by the Worker.
ALTER TABLE buyers ADD COLUMN phone TEXT;     -- ten digits, US
ALTER TABLE buyers ADD COLUMN address TEXT;   -- the street line on the licence
-- D11: every check is logged with the bid it guarded: the fields that were compared
-- ('' when the buyer gave none, so nothing could be compared).
ALTER TABLE bids ADD COLUMN shill_check TEXT;
-- D11 and D15: every bid refused for who the bidder is. The admin reads it in /admin/exposure.
CREATE TABLE IF NOT EXISTS bid_refusals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id TEXT NOT NULL,
  who TEXT NOT NULL,            -- buyer id, dealer:<gdn>, or admin
  reason TEXT NOT NULL,         -- seller_cannot_bid | not_a_buyer | win_cap
  matched TEXT,                 -- seller_cannot_bid: the field that matched (phone, address, name); win_cap: the count
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bid_refusals_at ON bid_refusals (at);
CREATE INDEX IF NOT EXISTS bid_refusals_lot ON bid_refusals (lot_id, at);
