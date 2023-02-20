const isWin = process.platform === 'win32'
jest.setTimeout(isWin ? 60000 : 30000)

const runTests = require('./serve.helper.js').runTests
test('electron:serve-ts', async () => {
  await runTests(true)
})
