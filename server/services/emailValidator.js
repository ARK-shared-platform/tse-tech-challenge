'use strict'

const { ValidationError } = require('../errors')

function validateEmailDomain(db, email) {
  const domain = email.split('@')[1]
  if (!domain) {
    throw new ValidationError('Invalid email address format')
  }

  const stmt = db.prepare('SELECT valid, reason FROM emails_cache WHERE domain = ?')
  stmt.bind([domain])

  let row = null
  if (stmt.step()) {
    row = stmt.getAsObject()
  }
  stmt.free()

  if (!row) {
    db.run(
      `INSERT INTO emails_cache (domain, valid, reason, checked_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [domain, 'invalid', 'domain not in approved list']
    )
    throw new ValidationError('Registration requirements not met')
  }

  if (row.valid === 'invalid') {
    throw new ValidationError('Registration requirements not met')
  }
}

module.exports = { validateEmailDomain }
