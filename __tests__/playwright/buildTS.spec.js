const { test } = require('@playwright/test')
test.setTimeout(100000)

const runTests = require('./build.helper.js').runTests

test('electron:build-ts', async () => {
  await runTests(true)
})
