'use strict'

const express = require('express')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
const initDb = require('./db/init')
const seedDb = require('./db/seed')
const { seedScenarioLogFile } = require('./db/seed')
const logger = require('./logger')
const { buildRegistrationMetadata } = require('./lib/registrationMetadata')
const { startLiveTrafficSimulator } = require('./jobs/liveTrafficSimulator')

function seedLogFile(logFile, db) {
  seedScenarioLogFile(logFile, db)
}

async function start() {
  const SQL = await initSqlJs({
    locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
  })

  const db = new SQL.Database()
  initDb(db)
  seedDb(db)
  seedLogFile(logger.logFile, db)
  startLiveTrafficSimulator(db, logger)

  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/profile', require('./routes/profile')(db, logger))
  app.use('/api/sql', require('./routes/sql')(db))
  app.use('/api/logs', require('./routes/logs')(logger.logFile, db))

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

    const metadata = err.registrationFields
      ? buildRegistrationMetadata(err.registrationFields)
      : null

    const eventType = err.name === 'ValidationError' ? 'validation_error' : 'server_error'
    const payload = err.name === 'ValidationError'
      ? JSON.stringify({
          message: logMessage,
          years_fundraising: err.yearsFundraising || null,
          dob: err.dob || null,
          password_rule: err.passwordRule || null
        })
      : JSON.stringify({ message: logMessage, reason: 'duplicate_cache_entry' })

    logger.log('ERROR', {
      error_uuid: errorId,
      message: logMessage,
      event_type: eventType,
      payload,
      ...(metadata ? { metadata } : {})
    })

    if (cacheUuid) {
      try {
        db.run(
          `INSERT INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [cacheUuid, errorId, eventType, payload, metadata]
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
