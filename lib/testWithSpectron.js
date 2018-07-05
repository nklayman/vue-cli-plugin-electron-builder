const execa = require('execa')
const Application = require('spectron').Application
const electronPath = require('electron')
const portfinder = require('portfinder')

portfinder.basePort = 9515

module.exports = (options = {}) =>
  new Promise(async (resolve, reject) => {
    let log = ''
    let outputDir = ''
    // Launch serve:electron in headless mode
    const child = execa(
      require.resolve('@vue/cli-service/bin/vue-cli-service'),
      ['serve:electron', '--headless', options.forceDev ? '--forceDev' : 'true']
    )
    // Exit if serve:electron throws an error
    child.on('error', err => {
      reject(err)
    })
    child.stdout.on('data', async data => {
      data = data.toString()
      log += data
      const urlMatch = data.match(/\$WEBPACK_DEV_SERVER_URL=http:\/\/[^/]+\//)
      const outputDirMatch = data.match(/\$outputDir=\b.*\b/)
      if (outputDirMatch) {
        // Record output dir
        outputDir = outputDirMatch[0].split('=')[1]
      }
      if (urlMatch) {
        // Record url and launch spectron
        const url = urlMatch[0].split('=')[1]
        let app
        if (!options.noSpectron) {
          const spectronOptions = {
            path: electronPath,
            args: [`${outputDir}/background.js`],
            env: {
              IS_TEST: true
            },
            //   Make sure tests do not interfere with each other
            port: await portfinder.getPortPromise(),
            // Apply user options
            ...options.spectronOptions
          }
          if (!spectronOptions.env.WEBPACK_DEV_SERVER_URL) {
            // Make sure dev server url is set
            spectronOptions.env.WEBPACK_DEV_SERVER_URL = url
          }

          // Launch app with spectron
          app = new Application(spectronOptions)
          if (!options.noStart) {
            await app.start()
            await app.client.waitUntilWindowLoaded()
          }
        }
        resolve({
          stdout: log,
          url,
          app,
          stopServe: () => {
            //   Exit serve process
            child.stdin.write('close')
            child.kill()
            // Close spectron
            if (app) return app.stop()
          }
        })
      }
    })
  })
