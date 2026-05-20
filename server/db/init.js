'use strict'

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      signup_uuid  TEXT NOT NULL,
      name       TEXT,
      email      TEXT,
      dob        TEXT,
      years_fundraising  TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS signups_cache (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_uuid   TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT,
      dob        TEXT,
      years_fundraising  TEXT,
      status     TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debug_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_uuid   TEXT,
      error_uuid TEXT,
      event_type TEXT,
      payload    TEXT,
      metadata   TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails_cache (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      domain     TEXT NOT NULL UNIQUE,
      reason     TEXT,
      valid      TEXT NOT NULL,
      checked_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

module.exports = initDb
