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
      valid      TEXT NOT NULL,
      reason     TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    INSERT OR IGNORE INTO emails_cache (domain, valid, reason) VALUES
      ('velora.com',   'valid',   'internal domain'),
      ('acme.com',     'valid',   'approved partner'),
      ('devcorp.io',   'valid',   'approved partner'),
      ('stratford.io', 'valid',   'approved partner'),
      ('example.com',  'invalid', 'reserved domain per RFC 2606'),
      ('test.com',     'invalid', 'blocked test domain'),
      ('gmail.com',    'invalid', 'consumer email domains are not accepted'),
      ('outlook.com',  'invalid', 'consumer email domains are not accepted'),
      ('yahoo.com',    'invalid', 'consumer email domains are not accepted'),
      ('hotmail.com',  'invalid', 'consumer email domains are not accepted');
  `)

  // Successful completions — present in both signups and signups_cache (status: completed)
  db.exec(`
    INSERT OR IGNORE INTO signups (signup_uuid, name, email, dob, years_fundraising, created_at) VALUES
      ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alice Chen',       'alice@velora.com',   '1985-03-12', '4', datetime('now', '-7 days')),
      ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bob Okafor',       'bob@acme.com',       '1982-09-28', '7', datetime('now', '-6 days')),
      ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Carol Smith',      'carol@devcorp.io',   '1997-07-04', '2', datetime('now', '-5 days')),
      ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Dave Miller',      'dave@velora.com',    '1980-11-15', '9', datetime('now', '-4 days')),
      ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'Fatima Al-Rashid', 'fatima@acme.com',    '1990-05-22', '5', datetime('now', '-3 days')),
      ('f6a7b8c9-d0e1-2345-f012-456789012345', 'George Kim',       'george@devcorp.io',  '1994-02-08', '3', datetime('now', '-3 days')),
      ('a7b8c9d0-e1f2-3456-0123-567890123456', 'Hannah Lee',       'hannah@velora.com',  '1988-12-30', '6', datetime('now', '-2 days')),
      ('b8c9d0e1-f2a3-4567-1234-678901234567', 'Isaac Patel',      'isaac@acme.com',     '1983-06-17', '8', datetime('now', '-2 days')),
      ('c9d0e1f2-a3b4-5678-2345-789012345678', 'Julia Santos',     'julia@stratford.io', '1992-10-03', '4', datetime('now', '-1 day')),
      ('d0e1f2a3-b4c5-6789-3456-890123456789', 'Kevin Brooks',     'kevin@velora.com',   '1986-04-25', '7', datetime('now', '-1 day')),
      ('e1f2a3b4-c5d6-7890-4567-901234567890', 'Laura Mwangi',     'laura@acme.com',     '1995-08-11', '3', datetime('now', '-18 hours')),
      ('f2a3b4c5-d6e7-8901-5678-012345678901', 'Marcus Webb',      'marcus@devcorp.io',  '1991-01-19', '5', datetime('now', '-12 hours'));
  `)

  db.exec(`
    INSERT OR IGNORE INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status, created_at) VALUES
      ('aa11bb22-cc33-dd44-ee55-ff6677889900', 'alice@velora.com',   'Alice Chen',       '1985-03-12', '4', 'completed', datetime('now', '-7 days')),
      ('bb22cc33-dd44-ee55-ff66-778899001122', 'bob@acme.com',       'Bob Okafor',       '1982-09-28', '7', 'completed', datetime('now', '-6 days')),
      ('cc33dd44-ee55-ff66-7788-990011223344', 'carol@devcorp.io',   'Carol Smith',      '1997-07-04', '2', 'completed', datetime('now', '-5 days')),
      ('dd44ee55-ff66-7788-9900-112233445566', 'dave@velora.com',    'Dave Miller',      '1980-11-15', '9', 'completed', datetime('now', '-4 days')),
      ('ee55ff66-7788-9900-1122-334455667788', 'fatima@acme.com',    'Fatima Al-Rashid', '1990-05-22', '5', 'completed', datetime('now', '-3 days')),
      ('ff667788-9900-1122-3344-556677889900', 'george@devcorp.io',  'George Kim',       '1994-02-08', '3', 'completed', datetime('now', '-3 days')),
      ('11223344-5566-7788-9900-aabbccddeeff', 'hannah@velora.com',  'Hannah Lee',       '1988-12-30', '6', 'completed', datetime('now', '-2 days')),
      ('22334455-6677-8899-aabb-ccddeeff0011', 'isaac@acme.com',     'Isaac Patel',      '1983-06-17', '8', 'completed', datetime('now', '-2 days')),
      ('33445566-7788-99aa-bbcc-ddeeff001122', 'julia@stratford.io', 'Julia Santos',     '1992-10-03', '4', 'completed', datetime('now', '-1 day')),
      ('44556677-8899-aabb-ccdd-eeff00112233', 'kevin@velora.com',   'Kevin Brooks',     '1986-04-25', '7', 'completed', datetime('now', '-1 day')),
      ('55667788-99aa-bbcc-ddee-ff0011223344', 'laura@acme.com',     'Laura Mwangi',     '1995-08-11', '3', 'completed', datetime('now', '-18 hours')),
      ('66778899-aabb-ccdd-eeff-001122334455', 'marcus@devcorp.io',  'Marcus Webb',      '1991-01-19', '5', 'completed', datetime('now', '-12 hours'));
  `)

  // Failed registrations — years_fundraising validation error, stuck in pending
  db.exec(`
    INSERT OR IGNORE INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status, created_at) VALUES
      ('a9b8c7d6-e5f4-3210-9876-543210fedcba', 'alex@acme.com',     'Alex Johnson', '1988-03-30', '11', 'pending', datetime('now', '-5 hours')),
      ('f7e6d5c4-b3a2-1098-fedc-ba9876543210', 'eva@velora.com',    'Eva Torres',   '1987-06-14', '12', 'pending', datetime('now', '-6 hours')),
      ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'tom@stratford.io', 'Tom Bradley',  '1982-09-07', '15', 'pending', datetime('now', '-3 hours')),
      ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'priya@velora.com', 'Priya Sharma', '1990-12-01', '10', 'pending', datetime('now', '-1 hour'));
  `)

  // Failed registrations — date of birth validation error, stuck in pending
  db.exec(`
    INSERT OR IGNORE INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status, created_at) VALUES
      ('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'liam@acme.com',      'Liam O''Brien',  '2010-08-15', '1', 'pending', datetime('now', '-8 hours')),
      ('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'sofia@stratford.io', 'Sofia Reeves',   '2027-03-20', '4', 'pending', datetime('now', '-2 hours'));
  `)

  // Debug events — years_fundraising failures
  db.exec(`
    INSERT OR IGNORE INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata, created_at) VALUES
      (
        'a9b8c7d6-e5f4-3210-9876-543210fedcba',
        'b1c2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6',
        'validation_error',
        '{"message":"Registration requirements not met","years_fundraising":"11"}',
        NULL,
        datetime('now', '-5 hours')
      ),
      (
        'f7e6d5c4-b3a2-1098-fedc-ba9876543210',
        'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        'validation_error',
        '{"message":"Registration requirements not met","years_fundraising":"12"}',
        NULL,
        datetime('now', '-6 hours')
      ),
      (
        '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
        'c2d3e4f5-a6b7-8c9d-0e1f-a2b3c4d5e6f7',
        'validation_error',
        '{"message":"Registration requirements not met","years_fundraising":"15"}',
        NULL,
        datetime('now', '-3 hours')
      ),
      (
        '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
        'd3e4f5a6-b7c8-9d0e-1f2a-b3c4d5e6f7a8',
        'validation_error',
        '{"message":"Registration requirements not met","years_fundraising":"10"}',
        NULL,
        datetime('now', '-1 hour')
      );
  `)

  // Debug events — date of birth failures (noise to query through)
  db.exec(`
    INSERT OR IGNORE INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata, created_at) VALUES
      (
        '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
        'f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c',
        'validation_error',
        '{"message":"You must be at least 18 years old to register","dob":"2010-08-15"}',
        NULL,
        datetime('now', '-8 hours')
      ),
      (
        '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
        'a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d',
        'validation_error',
        '{"message":"Date of birth must be in the past","dob":"2027-03-20"}',
        NULL,
        datetime('now', '-2 hours')
      );
  `)
}

module.exports = initDb
