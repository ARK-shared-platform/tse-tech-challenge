'use strict'

const { v4: uuidv4 } = require('uuid')
const { uniqueNamesGenerator, names } = require('unique-names-generator')

const DOMAINS = ['velora.com', 'acme.com', 'devcorp.io', 'stratford.io']

const MIN_INTERVAL_MS = 15 * 1000
const MAX_INTERVAL_MS = 45 * 1000

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDob({ underage = false, future = false } = {}) {
  if (future) {
    const year = new Date().getFullYear() + randomInt(1, 3)
    return `${year}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`
  }
  if (underage) {
    const year = new Date().getFullYear() - randomInt(1, 17)
    return `${year}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`
  }
  const year = randomInt(1965, 2003)
  return `${year}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`
}

function randomName() {
  return uniqueNamesGenerator({
    dictionaries: [names, names],
    separator: ' ',
    length: 2,
    style: 'capital'
  })
}

function randomPerson() {
  const name = randomName()
  const email = `${pick(['donor', 'member', 'supporter', 'partner'])}.${uuidv4().slice(0, 8)}@${pick(DOMAINS)}`
  const yearsFundraising = String(randomInt(1, 15))
  return { name, email, yearsFundraising }
}

function insertSuccessfulSignup(db, logger, person) {
  const cacheUuid = uuidv4()
  const signupUuid = uuidv4()
  const dob = randomDob()

  db.run(
    `INSERT INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status)
     VALUES (?, ?, ?, ?, ?, 'completed')`,
    [cacheUuid, person.email, person.name, dob, person.yearsFundraising]
  )
  db.run(
    `INSERT INTO signups (signup_uuid, name, email, dob, years_fundraising)
     VALUES (?, ?, ?, ?, ?)`,
    [signupUuid, person.name, person.email, dob, person.yearsFundraising]
  )

  logger.log('INFO', {
    message: 'Profile registration successful',
    signup_uuid: signupUuid
  })
}

function insertFailedSignup(db, logger, person) {
  const cacheUuid = uuidv4()
  const errorUuid = uuidv4()
  const failureRoll = Math.random()

  let dob
  let message
  let payload

  if (failureRoll < 0.55) {
    dob = randomDob()
    message = 'Registration requirements not met'
    payload = { message, years_fundraising: person.yearsFundraising }
  } else if (failureRoll < 0.8) {
    dob = randomDob({ underage: true })
    message = 'You must be at least 18 years old to register'
    payload = { message, dob }
  } else {
    dob = randomDob({ future: true })
    message = 'Date of birth must be in the past'
    payload = { message, dob }
  }

  db.run(
    `INSERT INTO signups_cache (cache_uuid, email, name, dob, years_fundraising, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [cacheUuid, person.email, person.name, dob, person.yearsFundraising]
  )
  db.run(
    `INSERT INTO debug_events (cache_uuid, error_uuid, event_type, payload, metadata)
     VALUES (?, ?, 'validation_error', ?, NULL)`,
    [cacheUuid, errorUuid, JSON.stringify(payload)]
  )

  logger.log('WARN', { message: "optional field 'referralCode' not provided" })
  logger.log('ERROR', {
    error_uuid: errorUuid,
    message,
    event_type: 'validation_error'
  })
}

function insertSyntheticTraffic(db, logger) {
  const batchSize = randomInt(2, 5)

  for (let i = 0; i < batchSize; i++) {
    const person = randomPerson()
    try {
      if (Math.random() < 0.45) {
        insertSuccessfulSignup(db, logger, person)
      } else {
        insertFailedSignup(db, logger, person)
      }
    } catch (err) {
      console.error('Live traffic simulator skipped insert:', err.message)
    }
  }
}

function scheduleNextTick(db, logger) {
  const delayMs = randomInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS)
  setTimeout(() => {
    insertSyntheticTraffic(db, logger)
    scheduleNextTick(db, logger)
  }, delayMs)
}

function startLiveTrafficSimulator(db, logger) {
  insertSyntheticTraffic(db, logger)
  scheduleNextTick(db, logger)
}

module.exports = { startLiveTrafficSimulator }
