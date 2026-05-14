'use strict'

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      signup_id  TEXT NOT NULL,
      name       TEXT,
      email      TEXT,
      years_exp  TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debug_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      signup_id  TEXT NOT NULL,
      error_uuid TEXT,
      event_type TEXT,
      payload    TEXT,
      metadata   TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails_cache (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      domain     TEXT NOT NULL UNIQUE,
      valid      TEXT NOT NULL,
      reason     TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    INSERT OR IGNORE INTO emails_cache (domain, valid, reason) VALUES
      ('velora.com',  'valid',   'internal domain'),
      ('acme.com',    'valid',   'approved partner'),
      ('devcorp.io',  'valid',   'approved partner'),
      ('example.com', 'invalid', 'reserved domain per RFC 2606'),
      ('test.com',    'invalid', 'blocked test domain'),
      ('gmail.com',   'invalid', 'consumer email domains are not accepted'),
      ('outlook.com', 'invalid', 'consumer email domains are not accepted'),
      ('yahoo.com',   'invalid', 'consumer email domains are not accepted');
  `)

  db.exec(`
    INSERT OR IGNORE INTO signups (signup_id, name, email, years_exp, created_at) VALUES
      ('sig-001', 'Alice Chen',  'alice@velora.com', '4', datetime('now', '-3 days')),
      ('sig-002', 'Bob Okafor',  'bob@acme.com',     '7', datetime('now', '-2 days')),
      ('sig-003', 'Carol Smith', 'carol@devcorp.io', '2', datetime('now', '-1 day')),
      ('sig-004', 'Dave Miller', 'dave@velora.com',  '9', datetime('now', '-12 hours'));
  `)
}

module.exports = initDb
