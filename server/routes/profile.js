'use strict'

const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { validateProfile } = require('../services/profileValidator')

module.exports = function createProfileRouter(db, logger) {
  const router = express.Router()

  router.post('/', (req, res, next) => {
    const cacheUuid = uuidv4()
    const { name, email, password, dob, yearsFundraising } = req.body

    // Always emitted — red herring in the log file
    logger.log('WARN', {
      message: "optional field 'referralCode' not provided"
    })

    // Write the attempt to signups_cache before validation.
    // The UNIQUE constraint on email will throw if this address already has a pending record.
    try {
      db.run(
        `INSERT INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [cacheUuid, email || null, name || null, dob || null, yearsFundraising || null]
      )
    } catch (insertErr) {
      // UNIQUE constraint fired — look up the existing pending record by email
      const stmt = db.prepare('SELECT cache_uuid FROM signups_cache WHERE email = ?')
      stmt.bind([email || ''])
      let existingCacheUuid = null
      if (stmt.step()) {
        existingCacheUuid = stmt.getAsObject().cache_uuid
      }
      stmt.free()

      const dupErr = new Error('Registration processing error')
      dupErr.statusCode = 422
      dupErr.cacheUuid = existingCacheUuid
      dupErr.isDuplicate = true
      dupErr.registrationFields = { name, email, password, dob, yearsFundraising }
      return next(dupErr)
    }

    // Run validation — lexicographical bug lives in profileValidator.js
    try {
      validateProfile(db, { name, email, password, dob, yearsFundraising })
    } catch (err) {
      err.cacheUuid = cacheUuid
      err.yearsFundraising = yearsFundraising
      err.dob = dob
      err.registrationFields = { name, email, password, dob, yearsFundraising }
      return next(err)
    }

    // Validation passed — promote to completed signups
    const signupUuid = uuidv4()
    db.run(
      `INSERT INTO signups (signup_uuid, name, email, dob, years_fundraising) VALUES (?, ?, ?, ?, ?)`,
      [signupUuid, name || null, email || null, dob || null, yearsFundraising || null]
    )
    db.run(
      `UPDATE signups_cache SET status = 'completed' WHERE cache_uuid = ?`,
      [cacheUuid]
    )

    logger.log('INFO', {
      message: 'Profile registration successful',
      signup_uuid: signupUuid
    })

    res.json({ success: true, message: 'Profile registered successfully.' })
  })

  return router
}
