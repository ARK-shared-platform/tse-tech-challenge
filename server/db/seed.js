'use strict'

const fs = require('fs')

const {
  BULK_TARGET,
  RETENTION_DAYS,
  MAX_SEED_HOURS_AGO,
  seedInterleaved,
  seedBulkSignups,
  buildBulkCacheRow,
  buildBulkDebugRow,
  sqlStr
} = require('./seedBulk')

const DEBUG_EVENTS_RETENTION_DAYS = RETENTION_DAYS

// Scenario timestamps (hours ago). All values must be <= MAX_SEED_HOURS_AGO (29 days).
const SCENARIO_HOURS = {
  evaTCompleted: 26 * 24,
  evaTSecond: 21 * 24,
  evaTThird: 4 * 24,
  tom: 7 * 24,
  priya: 2 * 24,
  liam: 20 * 24,
  sofia: 5 * 24,
  pwNora: 25 * 24,
  pwOwen: 22 * 24,
  pwPaula: 20 * 24,
  pwQuinn: 17 * 24
}

const EVA_PRIMARY_CACHE_UUID = 'f7e6d5c4-b3a2-1098-fedc-ba9876543210'
const EVA_WORK_CACHE_UUID = 'e9f8a7b6-c5d4-3e2f-1a0b-9c8d7e6f5a4b'
const ALEX_CACHE_UUID = 'a9b8c7d6-e5f4-3210-9876-543210fedcba'

// Fixed calendar dates for Eva Torres (see README reported issue)
const EVA_DATES = {
  firstAttempt: '2026-04-19 10:00:00',
  duplicateRetry: '2026-04-20 14:00:00',
  workAttempt: '2026-04-21 10:00:00'
}

const EVA_ERROR_UUIDS = {
  duplicateRetry: 'a8f3e2d1-4c6b-7a9e-8f0d-e2f1a3b4c5d7',
  workValidation: 'f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c'
}

const ALEX_YEARS_FUNDRAISING = '8'
const ALEX_DOB = '1994-06-12'
const ALEX_FIRST_ATTEMPT_DATE = '2026-05-10 08:00:00'

// Non-consecutive interleave slots so scenario rows are not adjacent in result sets
const ALEX_ATTEMPT_DEBUG_SLOTS = [91, 134, 176, 219, 263, 297, 342, 368, 391, 429]
const ALEX_ATTEMPT_TIMES = [
  '2026-05-10 08:00:00',
  '2026-05-10 08:53:00',
  '2026-05-10 09:31:00',
  '2026-05-10 10:18:00',
  '2026-05-10 11:04:00',
  '2026-05-10 11:47:00',
  '2026-05-10 12:36:00',
  '2026-05-10 13:22:00',
  '2026-05-10 14:55:00',
  '2026-05-10 16:08:00'
]
const ALEX_ATTEMPT_ERROR_UUIDS = [
  'b1c2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6',
  'alex0510-0002-4000-8000-000000000002',
  'alex0510-0003-4000-8000-000000000003',
  'alex0510-0004-4000-8000-000000000004',
  'alex0510-0005-4000-8000-000000000005',
  'alex0510-0006-4000-8000-000000000006',
  'alex0510-0007-4000-8000-000000000007',
  'alex0510-0008-4000-8000-000000000008',
  'alex0510-0009-4000-8000-000000000009',
  'alex0510-0010-4000-8000-000000000010'
]

// 1-based row slots (page = ceil(slot / 20)); slots 1–46 are completed signups
const SLOTS = {
  evaCache: 52,
  evaT1: 62,
  alexCache: 72,
  evaDuplicateDebug: 165,
  evaT2: 212,
  evaWorkCache: 258,
  evaWorkDebug: 341,
  evaT3: 372
}

function cacheRow(cacheUuid, email, name, dob, years, status, hoursAgo) {
  return `(${sqlStr(cacheUuid)}, ${sqlStr(email)}, ${sqlStr(name)}, ${sqlStr(dob)}, ${sqlStr(years)}, ${sqlStr(status)}, datetime('now', '-${hoursAgo} hours'))`
}

function cacheRowAt(cacheUuid, email, name, dob, years, status, createdAt) {
  return `(${sqlStr(cacheUuid)}, ${sqlStr(email)}, ${sqlStr(name)}, ${sqlStr(dob)}, ${sqlStr(years)}, ${sqlStr(status)}, ${sqlStr(createdAt)})`
}

function debugRow(cacheUuid, errorUuid, eventType, payload, metadata, hoursAgo) {
  return `(${sqlStr(cacheUuid)}, ${sqlStr(errorUuid)}, ${sqlStr(eventType)}, ${sqlStr(payload)}, ${sqlStr(metadata)}, datetime('now', '-${hoursAgo} hours'))`
}

function debugRowAt(cacheUuid, errorUuid, eventType, payload, metadata, createdAt) {
  return `(${sqlStr(cacheUuid)}, ${sqlStr(errorUuid)}, ${sqlStr(eventType)}, ${sqlStr(payload)}, ${sqlStr(metadata)}, ${sqlStr(createdAt)})`
}

function jsonMeta(fields) {
  return JSON.stringify(fields)
}

const SCENARIO_DEBUG_EXEMPT_FROM_PURGE = [
  EVA_ERROR_UUIDS.duplicateRetry,
  EVA_ERROR_UUIDS.workValidation,
  ...ALEX_ATTEMPT_ERROR_UUIDS
]

function applyDebugEventsRetention(db) {
  const exempt = SCENARIO_DEBUG_EXEMPT_FROM_PURGE.map(sqlStr).join(', ')
  db.exec(
    `DELETE FROM debug_events WHERE created_at < datetime('now', '-${DEBUG_EVENTS_RETENTION_DAYS} days')
     AND error_uuid NOT IN (${exempt})`
  )
}

function messageFromDebugPayload(payloadJson, eventType) {
  try {
    const payload = JSON.parse(payloadJson)
    if (payload && payload.message) return payload.message
  } catch {
    /* fall through */
  }
  return eventType === 'server_error'
    ? 'Registration processing error'
    : 'Registration requirements not met'
}

function createdAtToIso(createdAt) {
  return new Date(String(createdAt).replace(' ', 'T') + 'Z').toISOString()
}

function seedScenarioLogFile(logFile, db) {
  const now = Date.now()
  const entries = [
    {
      timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      level: 'INFO',
      message: 'Registration log service started'
    }
  ]

  const stmt = db.prepare(
    `SELECT error_uuid, event_type, payload, metadata, created_at
     FROM debug_events
     ORDER BY created_at`
  )
  while (stmt.step()) {
    const row = stmt.getAsObject()
    entries.push({
      timestamp: createdAtToIso(row.created_at),
      level: 'ERROR',
      error_uuid: row.error_uuid,
      message: messageFromDebugPayload(row.payload, row.event_type),
      event_type: row.event_type,
      metadata: row.metadata
    })
  }
  stmt.free()

  const content = entries.map(entry => JSON.stringify(entry) + '\n').join('')
  fs.writeFileSync(logFile, content)
}

function buildScenarioCacheSlots() {
  return {
    [SLOTS.evaCache]: cacheRowAt(
      EVA_PRIMARY_CACHE_UUID,
      'eva@velora.com',
      'Eva Torres',
      '1987-06-14',
      '12',
      'pending',
      EVA_DATES.firstAttempt
    ),
    [SLOTS.evaT1]: cacheRow(
      'b8c7d6e5-f4a3-2109-8765-43210fedcba9',
      'eva.thompson@devcorp.io',
      'Eva Thompson',
      '1991-08-22',
      '8',
      'completed',
      SCENARIO_HOURS.evaTCompleted
    ),
    [SLOTS.alexCache]: cacheRowAt(
      ALEX_CACHE_UUID,
      'alex@acme.com',
      'Alex Johnson',
      ALEX_DOB,
      ALEX_YEARS_FUNDRAISING,
      'pending',
      ALEX_FIRST_ATTEMPT_DATE
    ),
    [SLOTS.evaWorkCache]: cacheRowAt(
      EVA_WORK_CACHE_UUID,
      'eva.torres@acme.com',
      'Eva Torres',
      '1987-06-14',
      '12',
      'pending',
      EVA_DATES.workAttempt
    ),
    [SLOTS.evaT2]: cacheRow(
      'c7d6e5f4-a3b2-1098-7654-3210fedcba98',
      'eva.thompson@velora.com',
      'Eva Thompson',
      '1991-08-22',
      '1',
      'pending',
      SCENARIO_HOURS.evaTSecond
    ),
    [SLOTS.evaT3]: cacheRow(
      'd6e5f4a3-b2c1-0987-6543-210fedcba987',
      'eva.thompson@acme.com',
      'Eva Thompson',
      '1991-08-22',
      '8',
      'pending',
      SCENARIO_HOURS.evaTThird
    ),
    124: cacheRow('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'tom@stratford.io', 'Tom Bradley', '1982-09-07', '15', 'pending', SCENARIO_HOURS.tom),
    125: cacheRow('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'priya@velora.com', 'Priya Sharma', '1990-12-01', '10', 'pending', SCENARIO_HOURS.priya),
    126: cacheRow('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'liam@acme.com', 'Liam O\'Brien', '2010-08-15', '1', 'pending', SCENARIO_HOURS.liam),
    127: cacheRow('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'sofia@stratford.io', 'Sofia Reeves', '2027-03-20', '4', 'pending', SCENARIO_HOURS.sofia),
    128: cacheRow('pw01aaaa-bb11-cc22-dd33-ee44ff550001', 'nora.short@velora.com', 'Nora Short', '1990-04-22', '5', 'pending', SCENARIO_HOURS.pwNora),
    129: cacheRow('pw02aaaa-bb11-cc22-dd33-ee44ff550002', 'owen.lower@acme.com', 'Owen Mills', '1988-11-03', '6', 'pending', SCENARIO_HOURS.pwOwen),
    130: cacheRow('pw03aaaa-bb11-cc22-dd33-ee44ff550003', 'paula.nodigit@devcorp.io', 'Paula Grant', '1985-07-19', '4', 'pending', SCENARIO_HOURS.pwPaula),
    131: cacheRow('pw04aaaa-bb11-cc22-dd33-ee44ff550004', 'quinn.nosymbol@stratford.io', 'Quinn Reed', '1992-01-08', '7', 'pending', SCENARIO_HOURS.pwQuinn)
  }
}

function buildAlexMay10DebugSlots(alexMeta) {
  const rows = {}
  ALEX_ATTEMPT_DEBUG_SLOTS.forEach((slot, i) => {
    if (i === 0) {
      rows[slot] = debugRowAt(
        ALEX_CACHE_UUID,
        ALEX_ATTEMPT_ERROR_UUIDS[i],
        'validation_error',
        '{"message":"Registration requirements not met","years_fundraising":"11"}',
        alexMeta('alex@acme.com'),
        ALEX_ATTEMPT_TIMES[i]
      )
    } else {
      rows[slot] = debugRowAt(
        ALEX_CACHE_UUID,
        ALEX_ATTEMPT_ERROR_UUIDS[i],
        'server_error',
        '{"message":"Registration processing error","reason":"duplicate_cache_entry"}',
        alexMeta('alex@acme.com'),
        ALEX_ATTEMPT_TIMES[i]
      )
    }
  })
  return rows
}

function buildScenarioDebugSlots() {
  const evaMeta = (email) =>
    jsonMeta({
      name: 'Eva Torres',
      email,
      password: '[redacted]',
      dob: '1987-06-14',
      yearsFundraising: '12'
    })
  const alexMeta = (email) =>
    jsonMeta({
      name: 'Alex Johnson',
      email,
      password: '[redacted]',
      dob: ALEX_DOB,
      yearsFundraising: ALEX_YEARS_FUNDRAISING
    })
  const evaThompsonMeta = (email, yearsFundraising = '8') =>
    jsonMeta({
      name: 'Eva Thompson',
      email,
      password: '[redacted]',
      dob: '1991-08-22',
      yearsFundraising
    })

  return {
    [SLOTS.evaDuplicateDebug]: debugRowAt(
      EVA_PRIMARY_CACHE_UUID,
      EVA_ERROR_UUIDS.duplicateRetry,
      'server_error',
      '{"message":"Registration processing error","reason":"duplicate_cache_entry"}',
      evaMeta('eva@velora.com'),
      EVA_DATES.duplicateRetry
    ),
    [SLOTS.evaWorkDebug]: debugRowAt(
      EVA_WORK_CACHE_UUID,
      EVA_ERROR_UUIDS.workValidation,
      'validation_error',
      '{"message":"Registration requirements not met","years_fundraising":"12"}',
      evaMeta('eva.torres@acme.com'),
      EVA_DATES.workAttempt
    ),
    ...buildAlexMay10DebugSlots(alexMeta),
    [SLOTS.evaT2]: debugRow(
      'c7d6e5f4-a3b2-1098-7654-3210fedcba98',
      'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      'validation_error',
      '{"message":"Registration requirements not met","years_fundraising":"1"}',
      evaThompsonMeta('eva.thompson@velora.com', '1'),
      SCENARIO_HOURS.evaTSecond
    ),
    [SLOTS.evaT3]: debugRow(
      'd6e5f4a3-b2c1-0987-6543-210fedcba987',
      'c3d4e5f6-a7b8-9012-cdef-eva-thompson03',
      'validation_error',
      '{"message":"Password must include at least one special character","password_rule":"missing_special"}',
      evaThompsonMeta('eva.thompson@acme.com'),
      SCENARIO_HOURS.evaTThird
    ),
    124: debugRow(
      '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
      'c2d3e4f5-a6b7-8c9d-0e1f-a2b3c4d5e6f7',
      'validation_error',
      '{"message":"Registration requirements not met","years_fundraising":"15"}',
      '{"name":"Tom Bradley","email":"tom@stratford.io","password":"[redacted]","dob":"1982-09-07","yearsFundraising":"15"}',
      SCENARIO_HOURS.tom
    ),
    125: debugRow(
      '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
      'd3e4f5a6-b7c8-9d0e-1f2a-b3c4d5e6f7a8',
      'validation_error',
      '{"message":"Registration requirements not met","years_fundraising":"10"}',
      '{"name":"Priya Sharma","email":"priya@velora.com","password":"[redacted]","dob":"1990-12-01","yearsFundraising":"10"}',
      SCENARIO_HOURS.priya
    ),
    126: debugRow(
      '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
      'f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c',
      'validation_error',
      '{"message":"You must be at least 18 years old to register","dob":"2010-08-15"}',
      '{"name":"Liam O\'Brien","email":"liam@acme.com","password":"[redacted]","dob":"2010-08-15","yearsFundraising":"1"}',
      SCENARIO_HOURS.liam
    ),
    127: debugRow(
      '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
      'a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d',
      'validation_error',
      '{"message":"Date of birth must be in the past","dob":"2027-03-20"}',
      '{"name":"Sofia Reeves","email":"sofia@stratford.io","password":"[redacted]","dob":"2027-03-20","yearsFundraising":"4"}',
      SCENARIO_HOURS.sofia
    ),
    128: debugRow(
      'pw01aaaa-bb11-cc22-dd33-ee44ff550001',
      'epw001aa-bb11-cc22-dd33-ee44ff550001',
      'validation_error',
      '{"message":"Password must be at least 8 characters","password_rule":"too_short"}',
      '{"name":"Nora Short","email":"nora.short@velora.com","password":"[redacted]","dob":"1990-04-22","yearsFundraising":"5"}',
      SCENARIO_HOURS.pwNora
    ),
    129: debugRow(
      'pw02aaaa-bb11-cc22-dd33-ee44ff550002',
      'epw002aa-bb11-cc22-dd33-ee44ff550002',
      'validation_error',
      '{"message":"Password must include at least one lowercase letter","password_rule":"missing_lowercase"}',
      '{"name":"Owen Mills","email":"owen.lower@acme.com","password":"[redacted]","dob":"1988-11-03","yearsFundraising":"6"}',
      SCENARIO_HOURS.pwOwen
    ),
    130: debugRow(
      'pw03aaaa-bb11-cc22-dd33-ee44ff550003',
      'epw003aa-bb11-cc22-dd33-ee44ff550003',
      'validation_error',
      '{"message":"Password must include at least one number","password_rule":"missing_number"}',
      '{"name":"Paula Grant","email":"paula.nodigit@devcorp.io","password":"[redacted]","dob":"1985-07-19","yearsFundraising":"4"}',
      SCENARIO_HOURS.pwPaula
    ),
    131: debugRow(
      'pw04aaaa-bb11-cc22-dd33-ee44ff550004',
      'epw004aa-bb11-cc22-dd33-ee44ff550004',
      'validation_error',
      '{"message":"Password must include at least one special character","password_rule":"missing_special"}',
      '{"name":"Quinn Reed","email":"quinn.nosymbol@stratford.io","password":"[redacted]","dob":"1992-01-08","yearsFundraising":"7"}',
      SCENARIO_HOURS.pwQuinn
    )
  }
}

function seedDb(db) {
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

  // ── Completed signups (hand-picked) + bulk volume ─────────────────────────
  db.exec(`
    INSERT OR IGNORE INTO signups (signup_uuid, name, email, dob, years_fundraising, created_at) VALUES
      ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alice Chen',       'alice@velora.com',    '1985-03-12', '4', datetime('now', '-7 days')),
      ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bob Okafor',       'bob@acme.com',        '1982-09-28', '7', datetime('now', '-6 days')),
      ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Carol Smith',      'carol@devcorp.io',    '1997-07-04', '2', datetime('now', '-5 days')),
      ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Dave Miller',      'dave@velora.com',     '1980-11-15', '9', datetime('now', '-4 days')),
      ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'Fatima Al-Rashid', 'fatima@acme.com',     '1990-05-22', '5', datetime('now', '-3 days')),
      ('f6a7b8c9-d0e1-2345-f012-456789012345', 'George Kim',       'george@devcorp.io',   '1994-02-08', '3', datetime('now', '-3 days')),
      ('a7b8c9d0-e1f2-3456-0123-567890123456', 'Hannah Lee',       'hannah@velora.com',   '1988-12-30', '6', datetime('now', '-2 days')),
      ('b8c9d0e1-f2a3-4567-1234-678901234567', 'Isaac Patel',      'isaac@acme.com',      '1983-06-17', '8', datetime('now', '-2 days')),
      ('c9d0e1f2-a3b4-5678-2345-789012345678', 'Julia Santos',     'julia@stratford.io',  '1992-10-03', '4', datetime('now', '-1 day')),
      ('d0e1f2a3-b4c5-6789-3456-890123456789', 'Kevin Brooks',     'kevin@velora.com',    '1986-04-25', '7', datetime('now', '-1 day')),
      ('e1f2a3b4-c5d6-7890-4567-901234567890', 'Laura Mwangi',     'laura@acme.com',      '1995-08-11', '3', datetime('now', '-18 hours')),
      ('f2a3b4c5-d6e7-8901-5678-012345678901', 'Marcus Webb',      'marcus@devcorp.io',   '1991-01-19', '5', datetime('now', '-12 hours')),
      ('7711aa22-bb33-cc44-dd55-ee6677889901', 'Nina Ortiz',       'nina@velora.com',     '1984-01-20', '8', datetime('now', '-10 days')),
      ('8822bb33-cc44-dd55-ee66-778899001133', 'Ryan Cho',         'ryan@acme.com',       '1979-11-02', '9', datetime('now', '-9 days')),
      ('9933cc44-dd55-ee66-7788-990011223355', 'Morgan Ellis',     'morgan@velora.com',   '1993-04-18', '6', datetime('now', '-4 days')),
      ('aa44dd55-ee66-7788-9900-112233445577', 'Jordan Blake',     'jordan@devcorp.io',   '1986-07-30', '7', datetime('now', '-3 days')),
      ('n001aaaa-bb11-cc22-dd33-ee44ff550001', 'Zara Hassan',      'zara@velora.com',     '1989-04-11', '5', datetime('now', '-29 days')),
      ('n002aaaa-bb11-cc22-dd33-ee44ff550002', 'Felix Braun',      'felix@acme.com',      '1984-07-23', '7', datetime('now', '-29 days')),
      ('n003aaaa-bb11-cc22-dd33-ee44ff550003', 'Aisha Kamara',     'aisha@devcorp.io',    '1992-02-14', '3', datetime('now', '-28 days')),
      ('n004aaaa-bb11-cc22-dd33-ee44ff550004', 'Omar Farouk',      'omar@stratford.io',   '1981-09-05', '8', datetime('now', '-27 days')),
      ('n005aaaa-bb11-cc22-dd33-ee44ff550005', 'Claire Dubois',    'claire@velora.com',   '1995-11-17', '2', datetime('now', '-26 days')),
      ('n006aaaa-bb11-cc22-dd33-ee44ff550006', 'Elias Stern',      'elias@acme.com',      '1987-06-08', '6', datetime('now', '-25 days')),
      ('n007aaaa-bb11-cc22-dd33-ee44ff550007', 'Leila Nazari',     'leila@devcorp.io',    '1993-08-29', '4', datetime('now', '-24 days')),
      ('n008aaaa-bb11-cc22-dd33-ee44ff550008', 'Dmitri Volkov',    'dmitri@stratford.io', '1979-12-01', '9', datetime('now', '-23 days')),
      ('n009aaaa-bb11-cc22-dd33-ee44ff550009', 'Yuki Tanaka',      'yuki@velora.com',     '1991-03-20', '5', datetime('now', '-22 days')),
      ('n010aaaa-bb11-cc22-dd33-ee44ff550010', 'Pedro Alves',      'pedro@acme.com',      '1986-10-14', '7', datetime('now', '-21 days')),
      ('n011aaaa-bb11-cc22-dd33-ee44ff550011', 'Ingrid Larsson',   'ingrid@devcorp.io',   '1994-05-03', '3', datetime('now', '-20 days')),
      ('n012aaaa-bb11-cc22-dd33-ee44ff550012', 'Kwame Asante',     'kwame@stratford.io',  '1983-01-28', '8', datetime('now', '-19 days')),
      ('n013aaaa-bb11-cc22-dd33-ee44ff550013', 'Amara Diallo',     'amara@velora.com',    '1990-07-16', '6', datetime('now', '-18 days')),
      ('n014aaaa-bb11-cc22-dd33-ee44ff550014', 'Stefan Koch',      'stefan@acme.com',     '1985-04-07', '7', datetime('now', '-17 days')),
      ('n015aaaa-bb11-cc22-dd33-ee44ff550015', 'Nadia Petrov',     'nadia@devcorp.io',    '1996-09-22', '2', datetime('now', '-16 days')),
      ('n016aaaa-bb11-cc22-dd33-ee44ff550016', 'Ravi Menon',       'ravi@stratford.io',   '1982-06-30', '9', datetime('now', '-15 days')),
      ('n017aaaa-bb11-cc22-dd33-ee44ff550017', 'Chloe Bernard',    'chloe@velora.com',    '1993-12-18', '4', datetime('now', '-14 days')),
      ('n018aaaa-bb11-cc22-dd33-ee44ff550018', 'Tobias Fischer',   'tobias@acme.com',     '1980-02-25', '8', datetime('now', '-13 days')),
      ('n019aaaa-bb11-cc22-dd33-ee44ff550019', 'Yasmin Osei',      'yasmin@devcorp.io',   '1988-11-09', '5', datetime('now', '-12 days')),
      ('n020aaaa-bb11-cc22-dd33-ee44ff550020', 'Leon Hoffmann',    'leon@stratford.io',   '1991-07-04', '6', datetime('now', '-11 days')),
      ('n021aaaa-bb11-cc22-dd33-ee44ff550021', 'Adaeze Eze',       'adaeze@velora.com',   '1984-03-13', '7', datetime('now', '-10 days')),
      ('n022aaaa-bb11-cc22-dd33-ee44ff550022', 'Simon Carter',     'simon@acme.com',      '1989-08-01', '5', datetime('now', '-9 days')),
      ('n023aaaa-bb11-cc22-dd33-ee44ff550023', 'Freya Nielsen',    'freya@devcorp.io',    '1995-05-26', '3', datetime('now', '-8 days')),
      ('n024aaaa-bb11-cc22-dd33-ee44ff550024', 'Kofi Mensah',      'kofi@stratford.io',   '1987-01-15', '8', datetime('now', '-7 days')),
      ('n025aaaa-bb11-cc22-dd33-ee44ff550025', 'Mei Lin',          'mei@velora.com',      '1992-09-11', '4', datetime('now', '-6 days')),
      ('n026aaaa-bb11-cc22-dd33-ee44ff550026', 'Andre Moreau',     'andre@acme.com',      '1981-04-22', '9', datetime('now', '-5 days')),
      ('n027aaaa-bb11-cc22-dd33-ee44ff550027', 'Binta Diop',       'binta@devcorp.io',    '1993-10-07', '4', datetime('now', '-4 days')),
      ('n028aaaa-bb11-cc22-dd33-ee44ff550028', 'Hugo Lindqvist',   'hugo@stratford.io',   '1986-07-19', '6', datetime('now', '-3 days')),
      ('n029aaaa-bb11-cc22-dd33-ee44ff550029', 'Saoirse Flynn',    'saoirse@velora.com',  '1990-11-30', '5', datetime('now', '-2 days')),
      ('n030aaaa-bb11-cc22-dd33-ee44ff550030', 'Takeshi Mori',     'takeshi@acme.com',    '1985-06-04', '7', datetime('now', '-1 day')),
      ('evat0001-bb11-cc22-dd33-ee44ff550099', 'Eva Thompson',     'eva.thompson@devcorp.io', '1991-08-22', '8', datetime('now', '-${SCENARIO_HOURS.evaTCompleted} hours'));
  `)

  seedBulkSignups(db, BULK_TARGET - 46, 2000)

  const cacheHeader =
    'INSERT OR IGNORE INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status, created_at) VALUES'

  const completedCacheSlots = {}
  const completedPairs = [
    ['aa11bb22-cc33-dd44-ee55-ff6677889900', 'alice@velora.com', 'Alice Chen', '1985-03-12', '4', 168],
    ['bb22cc33-dd44-ee55-ff66-778899001122', 'bob@acme.com', 'Bob Okafor', '1982-09-28', '7', 144],
    ['cc33dd44-ee55-ff66-7788-990011223344', 'carol@devcorp.io', 'Carol Smith', '1997-07-04', '2', 120],
    ['dd44ee55-ff66-7788-9900-112233445566', 'dave@velora.com', 'Dave Miller', '1980-11-15', '9', 96],
    ['ee55ff66-7788-9900-1122-334455667788', 'fatima@acme.com', 'Fatima Al-Rashid', '1990-05-22', '5', 72],
    ['ff667788-9900-1122-3344-556677889900', 'george@devcorp.io', 'George Kim', '1994-02-08', '3', 72],
    ['11223344-5566-7788-9900-aabbccddeeff', 'hannah@velora.com', 'Hannah Lee', '1988-12-30', '6', 48],
    ['22334455-6677-8899-aabb-ccddeeff0011', 'isaac@acme.com', 'Isaac Patel', '1983-06-17', '8', 48],
    ['33445566-7788-99aa-bbcc-ddeeff001122', 'julia@stratford.io', 'Julia Santos', '1992-10-03', '4', 24],
    ['44556677-8899-aabb-ccdd-eeff00112233', 'kevin@velora.com', 'Kevin Brooks', '1986-04-25', '7', 24],
    ['55667788-99aa-bbcc-ddee-ff0011223344', 'laura@acme.com', 'Laura Mwangi', '1995-08-11', '3', 18],
    ['66778899-aabb-ccdd-eeff-001122334455', 'marcus@devcorp.io', 'Marcus Webb', '1991-01-19', '5', 12],
    ['7711aa22-bb33-cc44-dd55-ee6677889901', 'nina@velora.com', 'Nina Ortiz', '1984-01-20', '8', 240],
    ['8822bb33-cc44-dd55-ee66-778899001133', 'ryan@acme.com', 'Ryan Cho', '1979-11-02', '9', 216],
    ['9933cc44-dd55-ee66-7788-990011223355', 'morgan@velora.com', 'Morgan Ellis', '1993-04-18', '6', 96],
    ['aa44dd55-ee66-7788-9900-112233445577', 'jordan@devcorp.io', 'Jordan Blake', '1986-07-30', '7', 72],
    ['n001aaaa-bb11-cc22-dd33-ee44ff550001', 'zara@velora.com', 'Zara Hassan', '1989-04-11', '5', MAX_SEED_HOURS_AGO],
    ['n002aaaa-bb11-cc22-dd33-ee44ff550002', 'felix@acme.com', 'Felix Braun', '1984-07-23', '7', 696],
    ['n003aaaa-bb11-cc22-dd33-ee44ff550003', 'aisha@devcorp.io', 'Aisha Kamara', '1992-02-14', '3', 672],
    ['n004aaaa-bb11-cc22-dd33-ee44ff550004', 'omar@stratford.io', 'Omar Farouk', '1981-09-05', '8', 648],
    ['n005aaaa-bb11-cc22-dd33-ee44ff550005', 'claire@velora.com', 'Claire Dubois', '1995-11-17', '2', 624],
    ['n006aaaa-bb11-cc22-dd33-ee44ff550006', 'elias@acme.com', 'Elias Stern', '1987-06-08', '6', 600],
    ['n007aaaa-bb11-cc22-dd33-ee44ff550007', 'leila@devcorp.io', 'Leila Nazari', '1993-08-29', '4', 576],
    ['n008aaaa-bb11-cc22-dd33-ee44ff550008', 'dmitri@stratford.io', 'Dmitri Volkov', '1979-12-01', '9', 552],
    ['n009aaaa-bb11-cc22-dd33-ee44ff550009', 'yuki@velora.com', 'Yuki Tanaka', '1991-03-20', '5', 528],
    ['n010aaaa-bb11-cc22-dd33-ee44ff550010', 'pedro@acme.com', 'Pedro Alves', '1986-10-14', '7', 504],
    ['n011aaaa-bb11-cc22-dd33-ee44ff550011', 'ingrid@devcorp.io', 'Ingrid Larsson', '1994-05-03', '3', 480],
    ['n012aaaa-bb11-cc22-dd33-ee44ff550012', 'kwame@stratford.io', 'Kwame Asante', '1983-01-28', '8', 456],
    ['n013aaaa-bb11-cc22-dd33-ee44ff550013', 'amara@velora.com', 'Amara Diallo', '1990-07-16', '6', 432],
    ['n014aaaa-bb11-cc22-dd33-ee44ff550014', 'stefan@acme.com', 'Stefan Koch', '1985-04-07', '7', 408],
    ['n015aaaa-bb11-cc22-dd33-ee44ff550015', 'nadia@devcorp.io', 'Nadia Petrov', '1996-09-22', '2', 384],
    ['n016aaaa-bb11-cc22-dd33-ee44ff550016', 'ravi@stratford.io', 'Ravi Menon', '1982-06-30', '9', 360],
    ['n017aaaa-bb11-cc22-dd33-ee44ff550017', 'chloe@velora.com', 'Chloe Bernard', '1993-12-18', '4', 336],
    ['n018aaaa-bb11-cc22-dd33-ee44ff550018', 'tobias@acme.com', 'Tobias Fischer', '1980-02-25', '8', 312],
    ['n019aaaa-bb11-cc22-dd33-ee44ff550019', 'yasmin@devcorp.io', 'Yasmin Osei', '1988-11-09', '5', 288],
    ['n020aaaa-bb11-cc22-dd33-ee44ff550020', 'leon@stratford.io', 'Leon Hoffmann', '1991-07-04', '6', 264],
    ['n021aaaa-bb11-cc22-dd33-ee44ff550021', 'adaeze@velora.com', 'Adaeze Eze', '1984-03-13', '7', 240],
    ['n022aaaa-bb11-cc22-dd33-ee44ff550022', 'simon@acme.com', 'Simon Carter', '1989-08-01', '5', 216],
    ['n023aaaa-bb11-cc22-dd33-ee44ff550023', 'freya@devcorp.io', 'Freya Nielsen', '1995-05-26', '3', 192],
    ['n024aaaa-bb11-cc22-dd33-ee44ff550024', 'kofi@stratford.io', 'Kofi Mensah', '1987-01-15', '8', 168],
    ['n025aaaa-bb11-cc22-dd33-ee44ff550025', 'mei@velora.com', 'Mei Lin', '1992-09-11', '4', 144],
    ['n026aaaa-bb11-cc22-dd33-ee44ff550026', 'andre@acme.com', 'Andre Moreau', '1981-04-22', '9', 120],
    ['n027aaaa-bb11-cc22-dd33-ee44ff550027', 'binta@devcorp.io', 'Binta Diop', '1993-10-07', '4', 96],
    ['n028aaaa-bb11-cc22-dd33-ee44ff550028', 'hugo@stratford.io', 'Hugo Lindqvist', '1986-07-19', '6', 72],
    ['n029aaaa-bb11-cc22-dd33-ee44ff550029', 'saoirse@velora.com', 'Saoirse Flynn', '1990-11-30', '5', 48],
    ['n030aaaa-bb11-cc22-dd33-ee44ff550030', 'takeshi@acme.com', 'Takeshi Mori', '1985-06-04', '7', 24]
  ]
  completedPairs.forEach(([uuid, email, name, dob, years, hours], idx) => {
    completedCacheSlots[idx + 1] = cacheRow(uuid, email, name, dob, years, 'completed', hours)
  })

  // +2 filler rows: Eva/Alex reuse emails on retry so duplicate cache inserts are ignored
  seedInterleaved(
    db,
    BULK_TARGET + 2,
    { ...completedCacheSlots, ...buildScenarioCacheSlots() },
    cacheHeader,
    (n) => buildBulkCacheRow(n, n % 5 === 0 ? 'pending' : 'completed')
  )

  seedInterleaved(
    db,
    BULK_TARGET + 2,
    buildScenarioDebugSlots(),
    'INSERT OR IGNORE INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata, created_at) VALUES',
    buildBulkDebugRow
  )

  applyDebugEventsRetention(db)
}

module.exports = seedDb
module.exports.seedScenarioLogFile = seedScenarioLogFile
