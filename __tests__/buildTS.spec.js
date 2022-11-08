jest.setTimeout(600000)

const sleep = t => new Promise(resolve => setTimeout(resolve, t))

const runTests = require('./build.helper.js').runTests

test('electron:build-ts', async () => {
  // Prevent build/build-ts tests from overlapping
  await sleep(5000)
  await runTests(true)
})
