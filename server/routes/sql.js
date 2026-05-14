'use strict'

const express = require('express')

function isSelectOnly(sql) {
  const stripped = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
  return /^SELECT/i.test(stripped)
}

module.exports = function createSqlRouter(db) {
  const router = express.Router()

  router.post('/', (req, res) => {
    const { query } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'No query provided.' })
    }

    if (!isSelectOnly(query)) {
      return res.status(403).json({ error: 'Only SELECT statements are permitted.' })
    }

    try {
      const results = db.exec(query)

      if (!results.length) {
        return res.json({ columns: [], rows: [] })
      }

      const { columns, values } = results[0]
      const rows = (values || []).map(row => {
        const obj = {}
        columns.forEach((col, i) => { obj[col] = row[i] })
        return obj
      })

      res.json({ columns, rows })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  return router
}
