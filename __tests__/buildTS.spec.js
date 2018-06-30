jest.setTimeout(600000)

const runTests = require('./build.helper.js').runTests

test('build:electron-ts', async () => {
  await runTests(true)
})
