'use strict'

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 422
  }
}

module.exports = { ValidationError }
