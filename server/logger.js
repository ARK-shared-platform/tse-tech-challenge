'use strict'

const fs = require('fs')
const path = require('path')

const logsDir = path.join(__dirname, 'logs')
const logFile = path.join(logsDir, 'app.log')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

function log(level, data) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...data
  })
  fs.appendFileSync(logFile, entry + '\n')
}

module.exports = { log, logFile }
