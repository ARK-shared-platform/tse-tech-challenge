'use strict'

const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { validateProfile } = require('../services/profileValidator')

module.exports = function createProfileRouter(db, logger) {
  const router = express.Router()

  router.post('/', (req, res, next) => {
    const cacheId = uuidv4()
    const { name, email, password, dob, yearsExperience } = req.body

    // Always emitted — red herring in the log file
    logger.log('WARN', {
      message: "optional field 'referralCode' not provided",
      cache_id: cacheId
    })

    // Write the attempt to signups_cache before validation.
    // The UNIQUE constraint on email will throw if this address already has a pending record.
    try {
      db.run(
        `INSERT INTO signups_cache (cache_id, email, name, dob, years_exp, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [cacheId, email || null, name || null, dob || null, yearsExperience || null]
      )
    } catch (insertErr) {
      // UNIQUE constraint fired — look up the existing pending record by email
      const stmt = db.prepare('SELECT cache_id FROM signups_cache WHERE email = ?')
      stmt.bind([email || ''])
      let existingCacheId = null
      if (stmt.step()) {
        existingCacheId = stmt.getAsObject().cache_id
      }
      stmt.free()

      const dupErr = new Error('Registration processing error')
      dupErr.statusCode = 422
      dupErr.cacheId = existingCacheId
      dupErr.isDuplicate = true
      return next(dupErr)
    }

    // Run validation — lexicographical bug lives in profileValidator.js
    try {
      validateProfile(db, { name, email, password, dob, yearsExperience })
    } catch (err) {
      err.cacheId = cacheId
      err.yearsExp = yearsExperience
      err.dob = dob
      return next(err)
    }

    // Validation passed — promote to completed signups
    const signupId = uuidv4()
    db.run(
      `INSERT INTO signups (signup_id, name, email, dob, years_exp) VALUES (?, ?, ?, ?, ?)`,
      [signupId, name || null, email || null, dob || null, yearsExperience || null]
    )
    db.run(
      `UPDATE signups_cache SET status = 'completed' WHERE cache_id = ?`,
      [cacheId]
    )

    logger.log('INFO', {
      message: 'Profile registration successful',
      cache_id: cacheId,
      signup_id: signupId
    })

    res.json({ success: true, message: 'Profile registered successfully.' })
  })

  return router
}
