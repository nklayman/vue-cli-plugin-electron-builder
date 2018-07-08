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
    `jest.setTimeout(60000)
  const { testWithSpectron } = require('vue-cli-plugin-electron-builder')
  test('app loads a window', async () => {
    const { app, stdout, stopServe } = await testWithSpectron({mode: 'production'})
    expect(await app.client.getWindowCount()).toBe(1)
    // App is served in production mode
    expect(stdout.indexOf('App is served in production mode.')).not.toBe(-1)
    await stopServe()
  })
  `
  )
  process.env.NODE_ENV = 'production'
  await project.run('vue-cli-service test:unit')
})
