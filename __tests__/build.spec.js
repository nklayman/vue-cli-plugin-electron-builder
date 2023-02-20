const isWin = process.platform === 'win32'
jest.setTimeout(isWin ? 60000 : 30000)

const runTests = require('./build.helper.js').runTests

test('electron:build', async () => {
  await runTests()
})
