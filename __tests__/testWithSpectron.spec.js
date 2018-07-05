jest.setTimeout(100000)

const createProject = require('./createProject.helper.js')

test('basic tests pass', async () => {
  const { project } = await createProject('spectron', false, {
    '@vue/cli-plugin-unit-jest': {}
  })

  // Update jest config to find test
  const config = JSON.parse(await project.read('package.json'))
  config.jest.testMatch = ['<rootDir>/tests/unit/spectron.js']
  await project.write('package.json', JSON.stringify(config))

  // Create spectron test
  await project.write(
    'tests/unit/spectron.js',
    `jest.setTimeout(30000)
  const { testWithSpectron } = require('vue-cli-plugin-electron-builder')
  test('app loads a window', async () => {
    const { app, stopServe } = await testWithSpectron()
    expect(await app.client.getWindowCount()).toBe(1)
    await stopServe()
  })
  `
  )
  await project.run('vue-cli-service test:unit')
})
