'use strict'

const { ValidationError } = require('../errors')
const { validateEmailDomain, allowedDomainsMessage } = require('./emailValidator')

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
    throw new ValidationError(allowedDomainsMessage(db))
  }

  validatePassword(password)
  validateDateOfBirth(dob)
  validateEmailDomain(db, email)
  validateYearsFundraising(yearsFundraising)
}

function passwordValidationError(message, passwordRule) {
  const err = new ValidationError(message)
  err.passwordRule = passwordRule
  return err
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw passwordValidationError('Password is required', 'required')
  }

  if (password.length < 8) {
    throw passwordValidationError('Password must be at least 8 characters', 'too_short')
  }

  if (!/[A-Z]/.test(password)) {
    throw passwordValidationError(
      'Password must include at least one uppercase letter',
      'missing_uppercase'
    )
  }

  if (!/[a-z]/.test(password)) {
    throw passwordValidationError(
      'Password must include at least one lowercase letter',
      'missing_lowercase'
    )
  }

  if (!/[0-9]/.test(password)) {
    throw passwordValidationError(
      'Password must include at least one number',
      'missing_number'
    )
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw passwordValidationError(
      'Password must include at least one special character',
      'missing_special'
    )
  }
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
  if (typeof yearsFundraising !== 'string' || !/^\d+$/.test(yearsFundraising)) {
    throw new ValidationError('Years of fundraising experience must be a whole number')
  }

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
