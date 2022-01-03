const execa = require('execa')
const merge = require('lodash.merge')
const { _electron: electron } = require('playwright-core')

module.exports = (options = {}) =>
  new Promise((resolve, reject) => {
    let log = ''

    let outputDir = ''
    // Launch electron:serve in headless mode
    const child = execa(
      require.resolve('@vue/cli-service/bin/vue-cli-service', {
        paths: [process.cwd()]
      }),
      ['electron:serve', '--headless', '--mode', options.mode || 'production'],
      {
        extendEnv: false,
        env: {
          ...process.env,
          // Extending NODE_ENV causes warnings with build
          NODE_ENV: undefined
        }
      }
    )
    // Exit if electron:serve throws an error
    child.on('error', (err) => {
      reject(err)
    })
    child.stdout.on('data', async (data) => {
      data = data.toString()
      log += data
      const urlMatch = data.match(
        /\$WEBPACK_DEV_SERVER_URL=https?:\/\/[^/]+\/?/
      )
      const outputDirMatch = data.match(/\$outputDir=\b.*\b/)
      if (outputDirMatch) {
        // Record output dir
        outputDir = outputDirMatch[0].split('=')[1]
      }
      if (urlMatch) {
        // Record url and launch app
        const url = urlMatch[0].split('=')[1]
        let app
        if (!options.noPlaywright) {
          const launchOptions = merge(
            {
              args: [`${outputDir}`],
              env: {
                ...process.env,
                IS_TEST: true,
                WEBPACK_DEV_SERVER_URL: url
              }
            },
            // Apply user options
            options.launchOptions
          )
          // Launch app with playwright
          app = await electron.launch(launchOptions)
        }
        resolve({
          stdout: log,
          url,
          app,
          stop: () => {
            // Exit serve process
            child.stdin.write('close')
            child.kill('SIGKILL')
            // Close playwright
            return app.close()
          }
        })
      }
    })
  })
