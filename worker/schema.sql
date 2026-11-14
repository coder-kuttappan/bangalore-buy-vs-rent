-- Shared quotes. No names, contact details or IP addresses are stored.
-- Only the month is kept, not the exact time of submission.
CREATE TABLE IF NOT EXISTS quotes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  month          TEXT    NOT NULL,            -- 'YYYY-MM'
  area           TEXT    NOT NULL,
  bhk            TEXT    NOT NULL,
  sqft           INTEGER NOT NULL,
  price_per_sqft INTEGER,                     -- either price or rent may be missing
  rent_monthly   INTEGER,
  tier           TEXT,                        -- 'low' | 'mid' | 'high'
  project_name   TEXT,
  project_lat    REAL,
  project_lon    REAL,
  status         TEXT    NOT NULL DEFAULT 'ok' -- 'ok' is published; 'review' waits for a person
);
CREATE INDEX IF NOT EXISTS quotes_area ON quotes (area, status);

-- Abuse control: how many quotes one visitor has sent today. The visitor is a
-- one-way hash that changes every day; rows older than a day are deleted.
CREATE TABLE IF NOT EXISTS submitters (
  day   TEXT    NOT NULL,
  hash  TEXT    NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, hash)
);
