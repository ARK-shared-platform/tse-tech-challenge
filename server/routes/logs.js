'use strict'

const express = require('express')
const fs = require('fs')

module.exports = function createLogsRouter(logFile, db) {
  const router = express.Router()

  function sanitizeEntry(entry) {
    const { cache_id, cache_uuid, ...rest } = entry
    return rest
  }

  function lookupDebugEvent(errorUuid) {
    const stmt = db.prepare(
      'SELECT metadata, payload FROM debug_events WHERE error_uuid = ? LIMIT 1'
    )
    stmt.bind([errorUuid])
    let metadata = null
    let payload = null
    if (stmt.step()) {
      const row = stmt.getAsObject()
      metadata = row.metadata
      payload = row.payload
    }
    stmt.free()
    return { metadata, payload }
  }

  function readAllEntries() {
    if (!fs.existsSync(logFile)) return []
    const content = fs.readFileSync(logFile, 'utf8')
    const entries = []
    for (const line of content.split('\n').filter(Boolean)) {
      try { entries.push(sanitizeEntry(JSON.parse(line))) } catch { /* skip malformed */ }
    }
    return entries
  }

  // Search by error UUID — returns all log entries matching that UUID
  router.post('/search', (req, res) => {
    const { errorId } = req.body
    if (!errorId || typeof errorId !== 'string') {
      return res.status(400).json({ error: 'errorId is required.' })
    }

    const trimmedId = errorId.trim()
    const { metadata, payload } = lookupDebugEvent(trimmedId)
    const matches = readAllEntries()
      .filter(e => e.error_uuid === trimmedId)
      .map(entry => ({
        ...entry,
        metadata: entry.metadata ?? metadata,
        payload: entry.payload ?? payload
      }))
    res.json({ entries: matches })
  })

  return router
}
