'use strict'

const express = require('express')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
const initDb = require('./db/init')
const logger = require('./logger')
const { startLiveTrafficSimulator } = require('./jobs/liveTrafficSimulator')

function seedLogFile(logFile) {
  // Write historical log entries so the candidate has something to find
  // before they trigger any errors themselves.
  const now = Date.now()
  const entries = [
    // Liam O'Brien — DOB too young (8 hours ago)
    { timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 8 * 60 * 60 * 1000 + 95).toISOString(),   level: 'ERROR', error_uuid: 'f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c', message: 'You must be at least 18 years old to register', event_type: 'validation_error' },

    // Eva Torres — years_fundraising validation failure (6 hours ago)
    { timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 6 * 60 * 60 * 1000 + 80).toISOString(),   level: 'ERROR', error_uuid: 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', message: 'Registration requirements not met', event_type: 'validation_error' },

    // Alex Johnson — years_fundraising validation failure (5 hours ago)
    { timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 5 * 60 * 60 * 1000 + 75).toISOString(),   level: 'ERROR', error_uuid: 'b1c2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6', message: 'Registration requirements not met', event_type: 'validation_error' },

    // Tom Bradley — years_fundraising validation failure (3 hours ago)
    { timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 3 * 60 * 60 * 1000 + 88).toISOString(),   level: 'ERROR', error_uuid: 'c2d3e4f5-a6b7-8c9d-0e1f-a2b3c4d5e6f7', message: 'Registration requirements not met', event_type: 'validation_error' },

    // Sofia Reeves — DOB in the future (2 hours ago)
    { timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 2 * 60 * 60 * 1000 + 102).toISOString(),  level: 'ERROR', error_uuid: 'a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d', message: 'Date of birth must be in the past', event_type: 'validation_error' },

    // Priya Sharma — years_fundraising validation failure (1 hour ago)
    { timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),        level: 'WARN',  message: "optional field 'referralCode' not provided" },
    { timestamp: new Date(now - 1 * 60 * 60 * 1000 + 91).toISOString(),   level: 'ERROR', error_uuid: 'd3e4f5a6-b7c8-9d0e-1f2a-b3c4d5e6f7a8', message: 'Registration requirements not met', event_type: 'validation_error' },
  ]

  const content = entries.map(entry => JSON.stringify(entry) + '\n').join('')
  fs.writeFileSync(logFile, content)
}

async function start() {
  const SQL = await initSqlJs({
    locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
  })

  const db = new SQL.Database()
  initDb(db)
  seedLogFile(logger.logFile)
  startLiveTrafficSimulator(db, logger)

  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/profile', require('./routes/profile')(db, logger))
  app.use('/api/sql', require('./routes/sql')(db))
  app.use('/api/logs', require('./routes/logs')(logger.logFile))

  // Red herring: this endpoint intentionally returns 404
  app.use('/api/analytics', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Central error handler — logs a generic message (no stack trace), returns a sanitised response
  app.use((err, req, res, next) => {
    const errorId = uuidv4()
    const cacheUuid = err.cacheUuid || null

    const logMessage = err.name === 'ValidationError'
      ? err.message
      : 'Registration processing error'

    logger.log('ERROR', {
      error_uuid: errorId,
      message: logMessage,
      event_type: err.name === 'ValidationError' ? 'validation_error' : 'server_error'
    })

    if (cacheUuid) {
      try {
        const payload = err.name === 'ValidationError'
          ? JSON.stringify({ message: logMessage, years_fundraising: err.yearsFundraising || null, dob: err.dob || null })
          : JSON.stringify({ message: logMessage, reason: 'duplicate_cache_entry' })

        db.run(
          `INSERT INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata)
           VALUES (?, ?, ?, ?, NULL)`,
          [
            cacheUuid,
            errorId,
            err.name === 'ValidationError' ? 'validation_error' : 'server_error',
            payload
          ]
        )
      } catch (dbErr) {
        logger.log('ERROR', { message: 'Failed to write debug_event', error: dbErr.message })
      }
    }

    res.status(err.statusCode || 500).json({
      error: 'An unexpected error occurred. Please try again or contact support.',
      error_uuid: errorId
    })
  })

  const PORT = 3001
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
