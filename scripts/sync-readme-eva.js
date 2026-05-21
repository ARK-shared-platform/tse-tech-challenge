'use strict'

const fs = require('fs')
const path = require('path')
const { getEvaScenario } = require('../server/scenario/evaDates')

const START = '<!-- EVA_REPORT:START -->'
const END = '<!-- EVA_REPORT:END -->'
const readmePath = path.join(__dirname, '..', 'README.md')

const readme = fs.readFileSync(readmePath, 'utf8')
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`)

if (!pattern.test(readme)) {
  console.error(`README markers not found (${START} / ${END})`)
  process.exit(1)
}

const { readmeQuote } = getEvaScenario()
const updated = readme.replace(pattern, `${START}\n${readmeQuote}\n${END}`)

if (updated === readme) {
  process.exit(0)
}

fs.writeFileSync(readmePath, updated)
console.log('Updated Eva report dates in README.md')
