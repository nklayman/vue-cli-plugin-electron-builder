import { test } from '@playwright/test'
test.setTimeout(100000)

const runTestWithPlaywright = require('./testWithPlaywright.helper.js')

test('testWithPlayWright works', async () => {
  await runTestWithPlaywright()
})
