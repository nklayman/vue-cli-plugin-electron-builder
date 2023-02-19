const { test } = require('@playwright/test')
test.setTimeout(100000)

const runTests = require('./serve.helper.js').runTests

test('electron:serve-ts', async () => {
  await runTests(true)
})
