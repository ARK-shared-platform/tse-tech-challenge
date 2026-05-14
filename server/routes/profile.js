'use strict'

const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { validateProfile } = require('../services/profileValidator')

module.exports = function createProfileRouter(db, logger) {
  const router = express.Router()

  router.post('/', (req, res, next) => {
    const signupId = uuidv4()
    const { name, email, password, yearsExperience } = req.body

    // Always emitted — red herring in the log file
    logger.log('WARN', {
      message: "optional field 'referralCode' not provided",
      signup_id: signupId
    })

    // Record the attempt before validation so the SQL join always resolves
    db.run(
      `INSERT INTO signups (signup_id, name, email, years_exp) VALUES (?, ?, ?, ?)`,
      [signupId, name || null, email || null, yearsExperience || null]
    )

    try {
      validateProfile(db, { name, email, password, yearsExperience })
    } catch (err) {
      err.signupId = signupId
      return next(err)
    }

    logger.log('INFO', {
      message: 'Profile registration successful',
      signup_id: signupId
    })

    res.json({ success: true, message: 'Profile registered successfully.' })
  })

  return router
}
