'use strict'

const express = require('express')
const fs = require('fs')

module.exports = function createLogsRouter(logFile) {
  const router = express.Router()

  router.post('/search', (req, res) => {
    const { errorId } = req.body

    if (!errorId || typeof errorId !== 'string') {
      return res.status(400).json({ error: 'errorId is required.' })
    }

    if (!fs.existsSync(logFile)) {
      return res.json({ entries: [] })
    }

    const content = fs.readFileSync(logFile, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    const matches = []

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.error_uuid === errorId.trim()) {
          matches.push(entry)
        }
      } catch {
        // skip malformed lines
      }
    }

    res.json({ entries: matches })
  })

  return router
}
