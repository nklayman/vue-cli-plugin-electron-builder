const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const Config = require('webpack-chain')
const merge = require('lodash.merge')
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')
const {
  log,
  done,
  info,
  logWithSpinner,
  stopSpinner,
  warn,
  error
} = require('@vue/cli-shared-utils')
const formatStats = require('@vue/cli-service/lib/commands/build/formatStats')
const { chainWebpack, getExternals } = require('./lib/webpackConfig')

module.exports = (api, options) => {
  // If plugin options are provided in vue.config.js, those will be used. Otherwise it is empty object
  const pluginOptions =
    options.pluginOptions && options.pluginOptions.electronBuilder
      ? options.pluginOptions.electronBuilder
      : {}
  // If option is not set in pluginOptions, default is used
  const usesTypescript = pluginOptions.disableMainProcessTypescript
    ? false
    : api.hasPlugin('typescript')
  const mainProcessFile =
    pluginOptions.mainProcessFile ||
    (usesTypescript ? 'src/background.ts' : 'src/background.js')
  const mainProcessChain =
    pluginOptions.chainWebpackMainProcess || (config => config)
  const bundleMainProcess =
    pluginOptions.bundleMainProcess == null
      ? true
      : pluginOptions.bundleMainProcess

  const removeArg = (arg, count, rawArgs) => {
    const index = rawArgs.indexOf(arg)
    if (index !== -1) rawArgs.splice(index, count)
  }

  // Apply custom webpack config
  api.chainWebpack(async config => {
    chainWebpack(api, pluginOptions, config)
  })

  api.registerCommand(
    'electron:build',
    {
      description: 'build app with electron-builder',
      usage: 'vue-cli-service build:electron [electron-builder options]',
      details:
        `All electron-builder command line options are supported.\n` +
        `See https://www.electron.build/cli for cli options\n` +
        `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    (args, rawArgs) =>
      new Promise(async (resolve, reject) => {
        // Use custom config for webpack
        process.env.IS_ELECTRON = true
        const builder = require('electron-builder')
        const yargs = require('yargs')
        //   Import the yargs options from electron-builder
        const configureBuildCommand = require('electron-builder/out/builder')
          .configureBuildCommand
        // Prevent custom args from interfering with electron-builder
        removeArg('--mode', 2, rawArgs)
        removeArg('--dest', 2, rawArgs)
        removeArg('--legacy', 1, rawArgs)
        removeArg('--dashboard', 1, rawArgs)
        removeArg('--skipBundle', 1, rawArgs)
        // Parse the raw arguments using electron-builder yargs config
        const builderArgs = yargs
          .command(['build', '*'], 'Build', configureBuildCommand)
          .parse(rawArgs)
        //   Base config used in electron-builder build
        const outputDir =
          args.dest || pluginOptions.outputDir || 'dist_electron'
        const defaultBuildConfig = {
          directories: {
            output: outputDir,
            app: `${outputDir}/bundled`
          },
          files: ['**'],
          extends: null
        }
        //   User-defined electron-builder config, overwrites/adds to default config
        const userBuildConfig = pluginOptions.builderOptions || {}
        if (args.skipBundle) {
          console.log('Not bundling app as --skipBundle was passed')
          // Build with electron-builder
          buildApp()
        } else {
          const bundleOutputDir = path.join(outputDir, 'bundled')
          //   Arguments to be passed to renderer build
          const vueArgs = {
            _: [],
            // For the cli-ui webpack dashboard
            dashboard: args.dashboard,
            // Make sure files are outputted to proper directory
            dest: bundleOutputDir,
            // Enable modern mode unless --legacy is passed
            modern: !args.legacy
          }
          // With @vue/cli-service v3.4.1+, we can bypass legacy build
          process.env.VUE_CLI_MODERN_BUILD = !args.legacy
          // If the legacy builded is skipped the output dir won't be cleaned
          fs.removeSync(bundleOutputDir)
          fs.ensureDirSync(bundleOutputDir)
          // Mock data from legacy build
          const pages = options.pages || { index: '' }
          Object.keys(pages).forEach(page => {
            if (pages[page].filename) {
              // If page is configured as an object, use the filename (without .html)
              page = pages[page].filename.replace(/\.html$/, '')
            }
            fs.writeFileSync(
              path.join(bundleOutputDir, `legacy-assets-${page}.html.json`),
              '[]'
            )
          })
          //   Set the base url so that the app protocol is used
          options.baseUrl = pluginOptions.customFileProtocol || 'app://./'
          // Set publicPath as well (replaced baseUrl since @vue/cli 3.3.0)
          options.publicPath = pluginOptions.customFileProtocol || 'app://./'
          info('Bundling render process:')
          //   Build the render process with the custom args
          await api.service.run('build', vueArgs)
          // Copy package.json to output dir
          fs.copySync(
            api.resolve('./package.json'),
            `${outputDir}/bundled/package.json`
          )
          // Prevent electron-builder from installing app deps
          fs.ensureDirSync(`${outputDir}/bundled/node_modules`)
          //   Copy fonts to css/fonts. Fixes some issues with static font imports
          if (fs.existsSync(api.resolve(outputDir + '/bundled/fonts'))) {
            fs.ensureDirSync(api.resolve(outputDir + '/bundled/css/fonts'))
            fs.copySync(
              api.resolve(outputDir + '/bundled/fonts'),
              api.resolve(outputDir + '/bundled/css/fonts')
            )
          }

          if (bundleMainProcess) {
            //   Build the main process into the renderer process output dir
            const bundle = bundleMain({
              mode: 'build',
              api,
              args,
              pluginOptions,
              outputDir,
              mainProcessFile,
              mainProcessChain,
              usesTypescript
            })
            logWithSpinner('Bundling main process...')
            bundle.run((err, stats) => {
              stopSpinner(false)
              if (err) {
                return reject(err)
              }
              if (stats.hasErrors()) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return reject(`Build failed with errors.`)
              }
              const targetDirShort = path.relative(
                api.service.context,
                `${outputDir}/bundled`
              )
              log(formatStats(stats, targetDirShort, api))

              buildApp()
            })
          } else {
            info(
              'Not bundling main process as bundleMainProcess was set to false in plugin options'
            )
            // Copy main process file instead of bundling it
            fs.copySync(
              api.resolve(mainProcessFile),
              api.resolve(`${outputDir}/bundled/background.js`)
            )
            buildApp()
          }
        }
        function buildApp () {
          info('Building app with electron-builder:')
          // Build the app using electron builder
          builder
            .build({
              //   Args parsed with yargs
              ...builderArgs,
              config: merge(
                defaultBuildConfig,
                //   User-defined config overwrites defaults
                userBuildConfig
              )
            })
            .then(() => {
              // handle result
              done('Build complete!')
              resolve()
            })
            .catch(err => {
              // handle error
              return reject(err)
            })
        }
      })
  )
  api.registerCommand(
    'electron:serve',
    {
      description: 'serve app and launch electron',
      usage: 'vue-cli-service serve:electron',
      details: `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    async (args, rawArgs) => {
      // Use custom config for webpack
      process.env.IS_ELECTRON = true
      const execa = require('execa')
      const mainProcessWatch = [
        mainProcessFile,
        ...(pluginOptions.mainProcessWatch || [])
      ]
      const mainProcessArgs = pluginOptions.mainProcessArgs || []

      // Don't pass command args to electron
      removeArg('--dashboard', 1, rawArgs)
      removeArg('--debug', 1, rawArgs)
      removeArg('--headless', 1, rawArgs)

      // Run the serve command
      const server = await api.service.run('serve', {
        _: [],
        // Use dashboard if called from ui
        dashboard: args.dashboard
      })
      const outputDir = pluginOptions.outputDir || 'dist_electron'

      // Copy package.json so electron can detect app's name
      fs.copySync(api.resolve('./package.json'), `${outputDir}/package.json`)

      // Function to bundle main process and start Electron
      const startElectron = () => {
        if (bundleMainProcess) {
          //   Build the main process
          const bundle = bundleMain({
            mode: 'serve',
            api,
            args,
            pluginOptions,
            outputDir,
            mainProcessFile,
            mainProcessChain,
            usesTypescript,
            server
          })
          logWithSpinner('Bundling main process...')
          bundle.run((err, stats) => {
            stopSpinner(false)
            if (err) {
              throw err
            }
            if (stats.hasErrors()) {
              error(`Build failed with errors.`)
              process.exit(1)
            }
            const targetDirShort = path.relative(api.service.context, outputDir)
            log(formatStats(stats, targetDirShort, api))
            launchElectron()
          })
        } else {
          info(
            'Not bundling main process as bundleMainProcess was set to false in plugin options'
          )
          // Copy main process file instead of bundling it
          fs.copySync(
            api.resolve(mainProcessFile),
            api.resolve(`${outputDir}/index.js`)
          )
          launchElectron()
        }
      }

      // Electron process
      let child
      // Auto restart flag
      let childRestartOnExit = 0
      // Graceful exit timeout
      let childExitTimeout
      // Function to kill Electron process
      const killElectron = () => {
        if (!child) {
          return
        }

        // Attempt to kill gracefully
        if (process.platform === 'win32') {
          child.send('graceful-exit')
        } else {
          child.kill('SIGTERM')
        }

        // Kill unconditionally after 2 seconds if unsuccessful
        childExitTimeout = setTimeout(() => {
          if (child) {
            child.kill('SIGKILL')
          }
        }, 2000)
      }

      // Initial start of Electron
      startElectron()
      // Restart on main process file change
      mainProcessWatch.forEach(file => {
        fs.watchFile(api.resolve(file), () => {
          if (args.debug) {
            // Rebuild main process
            startElectron()
            return
          }
          // Never restart after SIGINT
          if (childRestartOnExit < 0) {
            return
          }

          // Set auto restart flag
          childRestartOnExit = 1

          killElectron()
        })
      })

      // Attempt to kill gracefully on SIGINT and SIGTERM
      const signalHandler = () => {
        if (!child) {
          process.exit(0)
        }

        // Prevent future restarts
        childRestartOnExit = -1

        killElectron()
      }

      if (!process.env.IS_TEST) process.on('SIGINT', signalHandler)
      if (!process.env.IS_TEST) process.on('SIGTERM', signalHandler)

      // Handle Ctrl+C on Windows
      if (process.platform === 'win32' && !process.env.IS_TEST) {
        readline
          .createInterface({
            input: process.stdin,
            output: process.stdout
          })
          .on('SIGINT', () => {
            process.emit('SIGINT')
          })
      }

      function launchElectron () {
        if (args.debug) {
          //   Do not launch electron and provide instructions on launching through debugger
          info(
            'Not launching electron as debug argument was passed. You must launch electron though your debugger.'
          )
          info(
            `If you are using Spectron, make sure to set the IS_TEST env variable to true.`
          )
          info(
            'Learn more about debugging the main process at https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/testingAndDebugging.html#debugging.'
          )
        } else if (args.headless) {
          // Log information for spectron
          console.log(`$outputDir=${outputDir}`)
          console.log(`$WEBPACK_DEV_SERVER_URL=${server.url}`)
        } else {
          // Launch electron with execa
          if (mainProcessArgs.length > 0) {
            info(
              'Launching Electron with arguments: "' +
                mainProcessArgs.join(' ') +
                ' ' +
                rawArgs.join(' ') +
                '" ...'
            )
          } else {
            info('Launching Electron...')
          }

          // Disable Electron process auto restart
          childRestartOnExit = 0

          let stdioConfig = [null, null, null]

          // Use an IPC on Windows for graceful exit
          if (process.platform === 'win32') stdioConfig.push('ipc')

          child = execa(
            require('electron'),
            [
              // Have it load the main process file built with webpack
              outputDir,
              // Append other arguments specified in plugin options
              ...mainProcessArgs,
              // Append args passed to command
              ...rawArgs
            ],
            {
              cwd: api.resolve('.'),
              env: {
                ...process.env,
                // Disable electron security warnings
                ELECTRON_DISABLE_SECURITY_WARNINGS: true
              },
              stdio: stdioConfig
            }
          )

          if (pluginOptions.removeElectronJunk === false) {
            // Pipe output to console
            child.stdout.pipe(process.stdout)
            child.stderr.pipe(process.stderr)
          } else {
            // Remove junk terminal output (#60)
            child.stdout
              .pipe(require('./lib/removeJunk.js')())
              .pipe(process.stdout)
            child.stderr
              .pipe(require('./lib/removeJunk.js')())
              .pipe(process.stderr)
          }

          child.on('exit', () => {
            child = null

            if (childExitTimeout) {
              clearTimeout(childExitTimeout)
              childExitTimeout = null
            }

            if (childRestartOnExit > 0) {
              startElectron()
            } else {
              process.exit(0)
            }
          })
        }
      }
    }
  )

  api.registerCommand(
    'build:electron',
    {
      description:
        '[deprecated, use electron:build instead] build app with electron-builder',
      usage: 'vue-cli-service build:electron [electron-builder options]',
      details:
        `All electron-builder command line options are supported.\n` +
        `See https://www.electron.build/cli for cli options\n` +
        `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    (args, rawArgs) => {
      warn('This command is deprecated. Please use electron:build instead.')
      return api.service.run(
        'electron:build',
        { ...args, _: ['First arg is removed', ...args._] },
        ['First arg is removed', ...rawArgs]
      )
    }
  )

  api.registerCommand(
    'serve:electron',
    {
      description:
        '[deprecated, use electron:serve instead] serve app and launch electron',
      usage: 'vue-cli-service serve:electron',
      details: `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    (args, rawArgs) => {
      warn('This command is deprecated. Please use electron:serve instead.')
      return api.service.run(
        'electron:serve',
        { ...args, _: ['First arg is removed', ...args._] },
        ['First arg is removed', ...rawArgs]
      )
    }
  )
}

function bundleMain ({
  mode,
  api,
  args,
  pluginOptions,
  outputDir,
  mainProcessFile,
  mainProcessChain,
  usesTypescript,
  server
}) {
  const mainProcessTypeChecking = pluginOptions.mainProcessTypeChecking || false
  const isBuild = mode === 'build'
  const NODE_ENV = process.env.NODE_ENV
  const config = new Config()
  config
    .mode(NODE_ENV)
    .target('electron-main')
    .node.set('__dirname', false)
    .set('__filename', false)
  // Set externals
  config.externals(getExternals(api, pluginOptions))

  config.output
    .path(api.resolve(outputDir + (isBuild ? '/bundled' : '')))
    // Electron will not detect background.js on dev server, only index.js
    .filename('[name].js')
  const envVars = {}
  if (isBuild) {
    //   Set __static to __dirname (files in public get copied here)
    config
      .plugin('define')
      .use(webpack.DefinePlugin, [{ __static: '__dirname' }])
  } else {
    // Set __static to public folder
    config.plugin('define').use(webpack.DefinePlugin, [
      {
        __static: JSON.stringify(api.resolve('./public'))
      }
    ])
    // Dev server url
    envVars['WEBPACK_DEV_SERVER_URL'] = server.url
    // Path to node_modules (for externals in development)
    envVars['NODE_MODULES_PATH'] = api.resolve('./node_modules')
  }
  // Add all env vars prefixed with VUE_APP_
  Object.keys(process.env).forEach(k => {
    if (/^VUE_APP_/.test(k)) {
      envVars[k] = process.env[k]
    }
  })
  config.plugin('env').use(webpack.EnvironmentPlugin, [envVars])

  if (args.debug) {
    // Enable source maps for debugging
    config.devtool('source-map')
  } else if (NODE_ENV === 'production') {
    // Minify for better performance
    config.plugin('uglify').use(TerserPlugin, [
      {
        parallel: true
      }
    ])
  }
  config
    .entry(isBuild ? 'background' : 'index')
    .add(api.resolve(mainProcessFile))
  const {
    transformer,
    formatter
  } = require('@vue/cli-service/lib/util/resolveLoaderError')
  config
    .plugin('friendly-errors')
    .use(require('friendly-errors-webpack-plugin'), [
      {
        additionalTransformers: [transformer],
        additionalFormatters: [formatter]
      }
    ])
  if (usesTypescript) {
    config.resolve.extensions.merge(['.js', '.ts'])
    config.module
      .rule('ts')
      .test(/\.ts$/)
      .use('ts-loader')
      .loader('ts-loader')
      .options({ transpileOnly: !mainProcessTypeChecking })
  }
  mainProcessChain(config)
  return webpack(config.toConfig())
}

module.exports.defaultModes = {
  'build:electron': 'production',
  'serve:electron': 'development',
  'electron:build': 'production',
  'electron:serve': 'development'
}
module.exports.testWithSpectron = require('./lib/testWithSpectron')
