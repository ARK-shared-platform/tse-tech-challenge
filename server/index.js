'use strict'

const express = require('express')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const initSqlJs = require('sql.js')
const initDb = require('./db/init')
const logger = require('./logger')

async function start() {
  const SQL = await initSqlJs({
    locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
  })

  const db = new SQL.Database()
  initDb(db)

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

  // Central error handler — generates UUID, logs details, returns generic response
  app.use((err, req, res, next) => {
    const errorId = uuidv4()
    const signupId = err.signupId || null

    logger.log('ERROR', {
      error_uuid: errorId,
      signup_id: signupId,
      message: err.message,
      stack: err.stack,
      event_type: err.name === 'ValidationError' ? 'validation_error' : 'server_error'
    })

    if (signupId) {
      try {
        db.run(
          `INSERT INTO debug_events (signup_id, error_uuid, event_type, payload, metadata)
           VALUES (?, ?, ?, ?, NULL)`,
          [
            signupId,
            errorId,
            err.name === 'ValidationError' ? 'validation_error' : 'server_error',
            JSON.stringify({ message: err.message, stack: err.stack })
          ]
        )
      } catch (dbErr) {
        logger.log('ERROR', { message: 'Failed to write debug_event', error: dbErr.message })
      }
    }

    res.status(err.statusCode || 500).json({
      error: 'An unexpected error occurred. Please try again or contact support.',
      errorId
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
