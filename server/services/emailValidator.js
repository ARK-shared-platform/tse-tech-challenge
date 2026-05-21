'use strict'

const { ValidationError } = require('../errors')

function getAllowedDomains(db) {
  const stmt = db.prepare("SELECT domain FROM emails_cache WHERE valid = 'valid' ORDER BY domain")
  const domains = []
  while (stmt.step()) {
    domains.push(stmt.getAsObject().domain)
  }
  stmt.free()
  return domains
}

function allowedDomainsMessage(db) {
  const domains = getAllowedDomains(db)
  return `Please enter an email from an accepted domain. Allowed domains: ${domains.join(', ')}`
}

function validateEmailDomain(db, email) {
  const domain = email.split('@')[1]
  if (!domain) {
    throw new ValidationError(allowedDomainsMessage(db))
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
    throw new ValidationError(allowedDomainsMessage(db))
  }

  if (row.valid === 'invalid') {
    throw new ValidationError(allowedDomainsMessage(db))
  }
}

module.exports = { validateEmailDomain, allowedDomainsMessage }
