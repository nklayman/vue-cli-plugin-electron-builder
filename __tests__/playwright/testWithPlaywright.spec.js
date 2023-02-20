import { test } from '@playwright/test'
const isWin = process.platform === 'win32'
test.setTimeout(20000)
test.slow(isWin)

const runTestWithPlaywright = require('./testWithPlaywright.helper.js')

test('testWithPlayWright works', async () => {
  await runTestWithPlaywright()
})
