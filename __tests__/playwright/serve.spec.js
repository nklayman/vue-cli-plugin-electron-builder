const { test } = require('@playwright/test')
const isWin = process.platform === 'win32'
test.setTimeout(20000)
test.slow(isWin)

const runTests = require('./serve.helper.js').runTests

test('electron:serve', async () => {
  await runTests()
})
