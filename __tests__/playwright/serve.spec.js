import { test } from '@playwright/test'
test.setTimeout(150000)

const runTests = require('./serve.helper.js').runTests

test('electron:serve', async () => {
  await runTests()
})
