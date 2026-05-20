'use strict'

function buildRegistrationMetadata(fields) {
  const { name, email, password, dob, yearsFundraising } = fields || {}
  return JSON.stringify({
    name: name || null,
    email: email || null,
    password: password ? '[redacted]' : null,
    dob: dob || null,
    yearsFundraising: yearsFundraising ?? null
  })
}

module.exports = { buildRegistrationMetadata }
