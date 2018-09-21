jest.setTimeout(600000)

const runTests = require('./build.helper.js').runTests

test('electron:build-ts', async () => {
  await runTests(true)
})
