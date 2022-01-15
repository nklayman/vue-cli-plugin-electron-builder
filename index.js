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
const { merge: webpackMerge } = require('webpack-merge')

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
    pluginOptions.chainWebpackMainProcess || ((config) => config)
  const bundleMainProcess =
    pluginOptions.bundleMainProcess == null
      ? true
      : pluginOptions.bundleMainProcess
  const rendererProcessFile =
    pluginOptions.rendererProcessFile !== undefined
      ? ['First arg is removed', pluginOptions.rendererProcessFile]
      : []

  const removeArg = (arg, count, rawArgs) => {
    const index = rawArgs.indexOf(arg)
    if (index !== -1) rawArgs.splice(index, count)
  }

  // Apply custom webpack config
  api.chainWebpack(async (config) => {
    chainWebpack(api, pluginOptions, config)
  })

  api.registerCommand(
    'electron:build',
    {
      description: 'build app with electron-builder',
      usage: 'vue-cli-service build:electron [electron-builder options]',
      details:
        'All electron-builder command line options are supported.\n' +
        'See https://www.electron.build/cli for cli options\n' +
        'See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.'
    },
    async (args, rawArgs) => {
      // Use custom config for webpack
      process.env.IS_ELECTRON = true
      const builder = require('electron-builder')
      const yargs = require('yargs')
      // Import the yargs options from electron-builder
      const configureBuildCommand =
        require('electron-builder/out/builder').configureBuildCommand
      // Prevent custom args from interfering with electron-builder
      removeArg('--mode', 2, rawArgs)
      removeArg('--dest', 2, rawArgs)
      removeArg('--skip-plugins', 2, rawArgs)
      removeArg('--legacy', 1, rawArgs)
      removeArg('--dashboard', 1, rawArgs)
      removeArg('--skipBundle', 1, rawArgs)
      removeArg('--skipElectronBuild', 1, rawArgs)
      removeArg('--report', 1, rawArgs)
      removeArg('--report-json', 1, rawArgs)
      // Parse the raw arguments using electron-builder yargs config
      const builderArgs = yargs
        .command(['build', '*'], 'Build', configureBuildCommand)
        .parse(rawArgs)
      // Base config used in electron-builder build
      const outputDir = args.dest || pluginOptions.outputDir || 'dist_electron'
      const defaultBuildConfig = {
        directories: {
          output: outputDir,
          app: `${outputDir}/bundled`
        },
        files: ['**'],
        extends: null
      }
      // User-defined electron-builder config, overwrites/adds to default config
      const userBuildConfig = pluginOptions.builderOptions || {}
      if (args.skipBundle) {
        console.log('Not bundling app as --skipBundle was passed')
        // Build with electron-builder
        buildApp()
      } else {
        const bundleOutputDir = path.join(outputDir, 'bundled')
        // Arguments to be passed to renderer build
        const vueArgs = {
          _: rendererProcessFile,
          // For the cli-ui webpack dashboard
          dashboard: args.dashboard,
          // Make sure files are outputted to proper directory
          dest: bundleOutputDir,
          // Enable modern mode unless --legacy is passed
          modern: !args.legacy,
          // --report and --report-json args
          report: args.report,
          'report-json': args['report-json'],
          skipPlugins: args.skipPlugins
        }
        // With @vue/cli-service v3.4.1+, we can bypass legacy build
        process.env.VUE_CLI_MODERN_BUILD = !args.legacy || ''
        // If the legacy builded is skipped the output dir won't be cleaned
        fs.removeSync(bundleOutputDir)
        fs.ensureDirSync(bundleOutputDir)
        // Mock data from legacy build
        const pages = options.pages || { index: '' }
        Object.keys(pages).forEach((page) => {
          // Use the filename option and fallback to the key
          const pagePath = path.parse(pages[page].filename || page)
          pagePath.name = `legacy-assets-${pagePath.name || page}`
          pagePath.ext = '.html.json'
          // Delete the base so that name/ext is used when formatting
          delete pagePath.base
          // Make sure parent dir exists
          if (pagePath.dir) {
            fs.ensureDirSync(path.join(bundleOutputDir, pagePath.dir))
          }
          fs.writeFileSync(
            path.join(bundleOutputDir, path.format(pagePath)),
            '[]'
          )
        })
        // Set the base url (publicPath) so that the app protocol is used
        options.publicPath = pluginOptions.customFileProtocol || 'app://./'
        info('Bundling render process:')
        // Build the render process with the custom args
        try {
          await api.service.run('build', vueArgs)
        } catch (e) {
          error(
            'Vue CLI build failed. Please resolve any issues with your build and try again.'
          )
          process.exit(1)
        }
        // Copy package.json to output dir
        const pkg = JSON.parse(
          fs.readFileSync(api.resolve('./package.json'), 'utf8')
        )
        const externals = getExternals(api, pluginOptions)
        // https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/223
        // Strip non-externals from dependencies so they won't be copied into app.asar
        Object.keys(pkg.dependencies || {}).forEach((dependency) => {
          if (!Object.keys(externals).includes(dependency)) {
            delete pkg.dependencies[dependency]
          }
        })
        fs.writeFileSync(
          `${outputDir}/bundled/package.json`,
          JSON.stringify(pkg, null, 2)
        )
        // Prevent electron-builder from installing app deps
        fs.ensureDirSync(`${outputDir}/bundled/node_modules`)

        if (bundleMainProcess) {
          // Build the main process into the renderer process output dir
          const { mainBundle, preloadBundle } = bundleMain({
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
          mainBundle.run((err, stats) => {
            stopSpinner(false)
            if (err) {
              throw err
            }
            if (stats.hasErrors()) {
              // eslint-disable-next-line prefer-promise-reject-errors
              throw new Error('Build failed with errors.')
            }
            const targetDirShort = path.relative(
              api.service.context,
              `${outputDir}/bundled`
            )
            log(formatStats(stats, targetDirShort, api))

            if (preloadBundle) {
              logWithSpinner('Bundling preload files...')
              preloadBundle.run((err, stats) => {
                stopSpinner(false)
                if (err) {
                  throw err
                }
                if (stats.hasErrors()) {
                  // eslint-disable-next-line prefer-promise-reject-errors
                  throw new Error('Build failed with errors.')
                }
                const targetDirShort = path.relative(
                  api.service.context,
                  `${outputDir}/bundled`
                )
                log(formatStats(stats, targetDirShort, api))

                buildApp()
              })
            } else {
              buildApp()
            }
          })
        } else {
          info(
            'Not bundling main process as bundleMainProcess was set to false in plugin options'
          )
          // Copy main process file instead of bundling it
          fs.copySync(
            api.resolve(mainProcessFile),
            api.resolve(`${outputDir}/bundled/index.js`)
          )
          buildApp()
        }
      }
      function buildApp () {
        if (args.skipElectronBuild) {
          console.log('Not building app as --skipElectronBuild was passed')
          return
        }
        info('Building app with electron-builder:')
        // Build the app using electron builder
        builder
          .build(
            merge({
              config: merge(
                defaultBuildConfig,
                // User-defined config overwrites defaults
                userBuildConfig
              ),
              // Args parsed with yargs
              ...builderArgs
            })
          )
          .then(() => {
            // handle result
            done('Build complete!')
          })
          .catch((err) => {
            console.error(err)
            process.exit(1)
          })
      }
    }
  )
  api.registerCommand(
    'electron:serve',
    {
      description: 'serve app and launch electron',
      usage: 'vue-cli-service serve:electron',
      details:
        'See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.'
    },
    async (args, rawArgs) => {
      // Use custom config for webpack
      process.env.IS_ELECTRON = true
      const execa = require('execa')
      const preload = pluginOptions.preload || {}
      const mainProcessWatch = [
        mainProcessFile,
        ...(pluginOptions.mainProcessWatch || []),
        ...(typeof preload === 'string' ? [preload] : Object.values(preload))
      ]
      const mainProcessArgs = pluginOptions.mainProcessArgs || []

      // Don't pass command args to electron
      removeArg('--skip-plugins', 2, rawArgs)
      removeArg('--dashboard', 1, rawArgs)
      removeArg('--debug', 1, rawArgs)
      removeArg('--headless', 1, rawArgs)
      removeArg('--https', 1, rawArgs)

      // Run the serve command
      const server = await api.service.run('serve', {
        _: rendererProcessFile,
        // Use dashboard if called from ui
        dashboard: args.dashboard,
        https: args.https,
        skipPlugins: args.skipPlugins
      })
      const outputDir = pluginOptions.outputDir || 'dist_electron'

      // Copy package.json so electron can detect app's name
      fs.copySync(api.resolve('./package.json'), `${outputDir}/package.json`)

      // Function to bundle main process and start Electron
      const startElectron = () => {
        queuedBuilds++
        if (bundleMainProcess) {
          // Build the main process
          const { mainBundle, preloadBundle } = bundleMain({
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
          mainBundle.run((err, stats) => {
            stopSpinner(false)
            if (err) {
              throw err
            }
            if (stats.hasErrors()) {
              error('Build failed with errors.')
              process.exit(1)
            }
            const targetDirShort = path.relative(api.service.context, outputDir)
            log(formatStats(stats, targetDirShort, api))

            if (preloadBundle) {
              preloadBundle.run((err, stats) => {
                stopSpinner(false)
                if (err) {
                  throw err
                }
                if (stats.hasErrors()) {
                  error('Build failed with errors.')
                  process.exit(1)
                }
                const targetDirShort = path.relative(
                  api.service.context,
                  outputDir
                )
                log(formatStats(stats, targetDirShort, api))
                launchElectron()
              })
            } else {
              launchElectron()
            }
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

      // Prevent multiple restarts at the same time
      let queuedBuilds = 0
      // Electron process
      let child
      let firstBundleCompleted = false
      // Function to kill Electron process
      const killElectron = () =>
        new Promise((resolve) => {
          if (!child || child.killed) {
            return resolve()
          }

          const currentChild = child
          currentChild.on('exit', () => {
            resolve()
          })

          // Attempt to kill gracefully
          if (process.platform === 'win32') {
            currentChild.send('graceful-exit')
          } else {
            currentChild.kill('SIGTERM')
          }

          // Kill unconditionally after 2 seconds if unsuccessful
          setTimeout(() => {
            if (!currentChild.killed) {
              warn(`Force killing Electron (process #${currentChild.pid})`)
              currentChild.kill('SIGKILL')
            }
          }, 2000)
        })

      // Initial start of Electron
      startElectron()
      // Restart on main process file change
      const chokidar = require('chokidar')
      chokidar
        .watch(mainProcessWatch.map((file) => api.resolve(file)))
        .on('all', () => {
          // This function gets triggered on first launch
          if (firstBundleCompleted) {
            startElectron()
          }
        })

      // Attempt to kill gracefully on SIGINT and SIGTERM
      const signalHandler = () => {
        if (!child) {
          process.exit(0)
        }

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

      async function launchElectron () {
        firstBundleCompleted = true
        // Don't exit process when electron is killed
        if (child) {
          child.removeListener('exit', onChildExit)
        }
        // Kill existing instances
        const waitTimeout = setTimeout(() => {
          // If killing Electron takes over 500ms:
          info('Waiting for Electron to exit...')
        }, 500)
        await killElectron()
        clearTimeout(waitTimeout)
        // Don't launch if a new background file is being bundled
        queuedBuilds--
        if (queuedBuilds > 0) return

        if (args.debug) {
          // Do not launch electron and provide instructions on launching through debugger
          info(
            'Not launching electron as debug argument was passed. You must launch electron through your debugger.'
          )
          info(
            'If you are using Playwright, make sure to set the IS_TEST env variable to true.'
          )
          info(
            'Learn more about debugging the main process at https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/testingAndDebugging.html#debugging.'
          )
        } else if (args.headless) {
          // Log information for playwright
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

          const stdioConfig = ['inherit', 'inherit', 'inherit']

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
              stdio: stdioConfig,
              windowsHide: false
            }
          )

          child.on('exit', onChildExit)
        }
      }

      function onChildExit () {
        process.exit(0)
      }
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
  config.mode(NODE_ENV).node.set('__dirname', false).set('__filename', false)
  // Set externals
  config.externals(getExternals(api, pluginOptions))

  config.output
    .path(api.resolve(outputDir + (isBuild ? '/bundled' : '')))
    .filename('[name].js')
  const envVars = {}
  if (isBuild) {
    // Set __static to __dirname (files in public get copied here)
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
    envVars.WEBPACK_DEV_SERVER_URL = server.url
    // Path to node_modules (for externals in development)
    envVars.NODE_MODULES_PATH = api.resolve('./node_modules')
  }
  // Add all env vars prefixed with VUE_APP_
  Object.keys(process.env).forEach((k) => {
    if (/^VUE_APP_/.test(k)) {
      envVars[k] = process.env[k]
    }
  })
  // Enable/disable nodeIntegration
  envVars.ELECTRON_NODE_INTEGRATION = !!pluginOptions.nodeIntegration
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

  const {
    transformer,
    formatter
  } = require('@vue/cli-service/lib/util/resolveLoaderError')
  config
    .plugin('friendly-errors')
    .use(require('@soda/friendly-errors-webpack-plugin'), [
      {
        additionalTransformers: [transformer],
        additionalFormatters: [formatter]
      }
    ])
  config.resolve.alias.set('@', api.resolve('src'))

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

  // Create mainConfig and preloadConfig and set unique configuration
  let mainConfig = new Config()
  let preloadConfig = new Config()

  mainConfig.target('electron-main')
  mainConfig.entry('index').add(api.resolve(mainProcessFile))

  preloadConfig.target('electron-preload')
  let preload = pluginOptions.preload
  if (preload) {
    // Add preload files if they are set in pluginOptions
    if (typeof preload === 'string') {
      preload = { preload }
    }
    Object.keys(preload).forEach((k) => {
      preloadConfig.entry(k).add(api.resolve(preload[k]))
    })
  }

  mainConfig = webpackMerge(config.toConfig(), mainConfig.toConfig())
  preloadConfig = webpackMerge(config.toConfig(), preloadConfig.toConfig())

  return {
    mainBundle: webpack(mainConfig),
    preloadBundle: preload ? webpack(preloadConfig) : undefined
  }
}

module.exports.defaultModes = {
  'electron:build': 'production',
  'electron:serve': 'development'
}
module.exports.testWithPlaywright = require('./lib/testWithPlaywright')
