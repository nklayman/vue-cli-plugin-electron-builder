jest.setTimeout(100000)

const runTests = require('./serve.helper.js').runTests
test('electron:serve', async () => {
  await runTests()
})
