const create = require('./createProject.helper.js')
const path = require('path')

const serve = (project, notifyUpdate) =>
  new Promise((resolve, reject) => {
    // --debug to prevent Electron from being launched
    const child = project.run('vue-cli-service electron:serve --headless')
    let log = ''
    child.stdout.on('data', async (data) => {
      data = data.toString()
      log += data
      try {
        if (
          data.match(
            // Dev server is finished and index.js is created
            /\$WEBPACK_DEV_SERVER_URL=/
          )
        ) {
          resolve({
            stdout: log,
            stopServe: () => {
              child.stdin.write('close')
            }
          })
        } else if (data.match(/App updated/)) {
          if (notifyUpdate) {
            notifyUpdate(data)
          }
        } else if (data.match(/Failed to compile/)) {
          reject(data)
        }
      } catch (err) {
        reject(err)
      }
    })
  })
const runTests = async (useTS) => {
  const { project } = await create('serve', useTS)

  // Wait for dev server to start
  const { stopServe } = await serve(project)
  expect(project.has(path.join('dist_electron', 'index.js'))).toBe(true)
  await stopServe()

  // Launch app with playwright is done in with Playwright runner
}

module.exports.runTests = runTests
