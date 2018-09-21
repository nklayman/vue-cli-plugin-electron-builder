jest.setTimeout(600000)

const runTests = require('./build.helper.js').runTests

test('electron:build', async () => {
  await runTests()
})
