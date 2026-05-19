'use strict'

const { ValidationError } = require('../errors')
const { validateEmailDomain } = require('./emailValidator')

const MIN_YEARS_FUNDRAISING = 2

function normalizeInput(fields) {
  return {
    name: typeof fields.name === 'string' ? fields.name.trim() : fields.name,
    email: typeof fields.email === 'string' ? fields.email.trim().toLowerCase() : fields.email,
    password: fields.password,
    dob: typeof fields.dob === 'string' ? fields.dob.trim() : fields.dob,
    yearsFundraising: typeof fields.yearsFundraising === 'string' ? fields.yearsFundraising.trim() : fields.yearsFundraising,
  }
}

function validateProfile(db, fields) {
  const { name, email, password, dob, yearsFundraising } = normalizeInput(fields)

  if (!name || name.trim().length < 2) {
    throw new ValidationError('Full name must be at least 2 characters')
  }

  if (!email || !email.includes('@')) {
    throw new ValidationError('A valid email address is required')
  }

  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters')
  }

  validateDateOfBirth(dob)
  validateEmailDomain(db, email)
  validateYearsFundraising(yearsFundraising)
}

function validateDateOfBirth(dob) {
  if (!dob) throw new ValidationError('Date of birth is required')

  const date = new Date(dob)
  if (isNaN(date.getTime())) throw new ValidationError('Invalid date of birth')

  const today = new Date()
  if (date >= today) throw new ValidationError('Date of birth must be in the past')

  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  )
  if (date > eighteenYearsAgo) throw new ValidationError('You must be at least 18 years old to register')
}

function validateYearsFundraising(yearsFundraising) {
  const threshold = MIN_YEARS_FUNDRAISING.toFixed(0)
  try {
    if (yearsFundraising < threshold) {
      throw new Error('Registration requirements not met')
    }
  } catch (e) {
    throw new ValidationError(e.message)
  }
}

module.exports = { validateProfile }
