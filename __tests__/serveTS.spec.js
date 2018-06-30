jest.setTimeout(100000)

const runTests = require('./serve.helper.js').runTests
test('serve:electron-ts', async () => {
  await runTests(true)
})
