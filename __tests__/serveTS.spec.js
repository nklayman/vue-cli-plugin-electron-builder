jest.setTimeout(100000)

const sleep = t => new Promise(resolve => setTimeout(resolve, t))

const runTests = require('./serve.helper.js').runTests
test('electron:serve-ts', async () => {
  // Prevent serve/serve-ts tests from overlapping
  await sleep(2000)
  await runTests(true)
})
