'use strict'

const {
  RETENTION_DAYS,
  atHoursAgo,
  atDaysAgoAtTime,
  formatSqlTimestamp
} = require('../db/seedBulk')

const EVA_ATTEMPT_SCHEDULE = [
  { key: 'firstAttempt', daysAgo: RETENTION_DAYS + 1, hour: 10, minute: 0 },
  { key: 'secondAttempt', hoursAgo: (RETENTION_DAYS - 1) * 24 + 12 },
  { key: 'thirdAttempt', hoursAgo: (RETENTION_DAYS - 2) * 24 + 12 }
]

function formatReadmeDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

function buildEvaReadmeQuote(displayDates) {
  const [first, second, third] = displayDates
  return (
    `> "Hi, on ${first} I tried to create my Velora profile with \`eva@velora.com\` and got a generic error message, no details, nothing useful. ` +
    `I tried again on ${second} with the same email and got the same error. On ${third} I tried with my work email, \`eva.torres@acme.com\`, and still got the same thing. ` +
    `Three attempts, three failures, and I'm stuck. My whole team is waiting on me to get set up, and everyone else signed up fine. This is really frustrating; can someone please look into why this keeps happening to me?"`
  )
}

function getEvaScenario(referenceDate = new Date()) {
  const sqlDates = {}
  const displayDates = []

  for (const slot of EVA_ATTEMPT_SCHEDULE) {
    const when =
      slot.hoursAgo != null
        ? atHoursAgo(slot.hoursAgo, referenceDate)
        : atDaysAgoAtTime(slot.daysAgo, slot.hour, slot.minute, referenceDate)
    sqlDates[slot.key] = formatSqlTimestamp(when)
    displayDates.push(formatReadmeDate(when))
  }

  return {
    dates: sqlDates,
    readmeQuote: buildEvaReadmeQuote(displayDates)
  }
}

module.exports = {
  getEvaScenario,
  formatReadmeDate
}
