'use strict'

const { uniqueNamesGenerator, names } = require('unique-names-generator')

const DOMAINS = ['velora.com', 'acme.com', 'devcorp.io', 'stratford.io']

const RETENTION_DAYS = 30
const BULK_TARGET = 460
const BATCH_SIZE = 50
const RETENTION_HOURS = RETENTION_DAYS * 24
const MIN_SEED_HOURS_AGO = 12
// Keep seeded rows inside the debug_events purge window (30 days).
const MAX_SEED_HOURS_AGO = RETENTION_HOURS - 24

function hoursAgoWithinRetention(n) {
  const span = MAX_SEED_HOURS_AGO - MIN_SEED_HOURS_AGO
  return MIN_SEED_HOURS_AGO + (n % (span + 1))
}

function pad(n, len) {
  return String(n).padStart(len, '0')
}

function bulkUuid(prefix, n) {
  const h = pad(n, 8)
  return `${prefix}${h.slice(0, 4)}-bulk-${h.slice(4, 8)}-4c4d-8e8e0000${pad(n % 10000, 4)}`
}

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function personAt(n) {
  const name = uniqueNamesGenerator({
    dictionaries: [names, names],
    separator: ' ',
    length: 2,
    style: 'capital',
    seed: n
  })
  const domain = DOMAINS[n % DOMAINS.length]
  const email = `user${pad(n, 5)}@${domain}`
  const year = 1975 + (n % 25)
  const month = pad((n % 12) + 1, 2)
  const day = pad((n % 28) + 1, 2)
  const dob = `${year}-${month}-${day}`
  const years = String((n % 9) + 1)
  const hoursAgo = hoursAgoWithinRetention(n)
  return { name, email, dob, years, hoursAgo, domain }
}

function execBatches(db, header, rows, batchSize = BATCH_SIZE) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    db.exec(`${header}\n${chunk.join(',\n')};`)
  }
}

function buildBulkSignupRow(n) {
  const p = personAt(n)
  const uuid = bulkUuid('b0', n)
  return `(${sqlStr(uuid)}, ${sqlStr(p.name)}, ${sqlStr(p.email)}, ${sqlStr(p.dob)}, ${sqlStr(p.years)}, datetime('now', '-${p.hoursAgo} hours'))`
}

function buildBulkCacheRow(n, status) {
  const p = personAt(n)
  const uuid = bulkUuid('c0', n)
  return `(${sqlStr(uuid)}, ${sqlStr(p.email)}, ${sqlStr(p.name)}, ${sqlStr(p.dob)}, ${sqlStr(p.years)}, ${sqlStr(status)}, datetime('now', '-${p.hoursAgo} hours'))`
}

function buildBulkDebugRow(n) {
  const p = personAt(n)
  const cacheUuid = bulkUuid('c0', n)
  const errorUuid = bulkUuid('e0', n)
  const failYears = String(10 + (n % 7))
  const payload = `{"message":"Registration requirements not met","years_fundraising":${sqlStr(failYears).slice(1, -1)}}`
  const metadata = `{"name":${sqlStr(p.name)},"email":${sqlStr(p.email)},"password":"[redacted]","dob":${sqlStr(p.dob)},"yearsFundraising":${sqlStr(failYears)}}`
  return `(${sqlStr(cacheUuid)}, ${sqlStr(errorUuid)}, 'validation_error', ${sqlStr(payload)}, ${sqlStr(metadata)}, datetime('now', '-${p.hoursAgo} hours'))`
}

/** Insert rows at 1-based slot positions; filler uses bulk generators. */
function seedInterleaved(db, total, slotRows, header, buildFiller) {
  const slots = new Map(Object.entries(slotRows).map(([k, v]) => [Number(k), v]))
  const rows = []
  let fillerIndex = 10000

  for (let slot = 1; slot <= total; slot++) {
    if (slots.has(slot)) {
      rows.push(slots.get(slot))
    } else {
      rows.push(buildFiller(fillerIndex++))
    }
  }

  execBatches(db, header, rows)
}

function seedBulkSignups(db, count, startIndex = 5000) {
  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push(buildBulkSignupRow(startIndex + i))
  }
  execBatches(
    db,
    'INSERT OR IGNORE INTO signups (signup_uuid, name, email, dob, years_fundraising, created_at) VALUES',
    rows
  )
}

function seedBulkSignupsCache(db, count, startIndex = 5000) {
  const rows = []
  for (let i = 0; i < count; i++) {
    const status = i % 5 === 0 ? 'pending' : 'completed'
    rows.push(buildBulkCacheRow(startIndex + i, status))
  }
  execBatches(
    db,
    'INSERT OR IGNORE INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status, created_at) VALUES',
    rows
  )
}

function seedBulkDebugEvents(db, count, startIndex = 5000) {
  const rows = []
  for (let i = 0; i < count; i++) {
    rows.push(buildBulkDebugRow(startIndex + i))
  }
  execBatches(
    db,
    'INSERT OR IGNORE INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata, created_at) VALUES',
    rows
  )
}

module.exports = {
  BULK_TARGET,
  RETENTION_DAYS,
  RETENTION_HOURS,
  MIN_SEED_HOURS_AGO,
  MAX_SEED_HOURS_AGO,
  seedInterleaved,
  seedBulkSignups,
  seedBulkSignupsCache,
  seedBulkDebugEvents,
  buildBulkCacheRow,
  buildBulkDebugRow,
  sqlStr
}
