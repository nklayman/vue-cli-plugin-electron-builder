const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')
const Config = require('webpack-chain')
const merge = require('lodash.merge')
const fs = require('fs-extra')
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
  const outputDir = pluginOptions.outputDir || 'dist_electron'
  const mainProcessFile =
    pluginOptions.mainProcessFile ||
    (usesTypescript ? 'src/background.ts' : 'src/background.js')
  const mainProcessChain =
    pluginOptions.chainWebpackMainProcess || (config => config)

  // Apply custom webpack config
  api.chainWebpack(async config => {
    chainWebpack(api, pluginOptions, config)
  })

  api.registerCommand(
    'build:electron',
    {
      description: 'build app with electron-builder',
      usage: 'vue-cli-service build:electron [electron-builder options]',
      details:
        `All electron-builder command line options are supported.\n` +
        `See https://www.electron.build/cli for cli options\n` +
        `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    async (args, rawArgs) => {
      // Use custom config for webpack
      process.env.IS_ELECTRON = true
      const builder = require('electron-builder')
      const yargs = require('yargs')
      //   Import the yargs options from electron-builder
      const configureBuildCommand = require('electron-builder/out/builder')
        .configureBuildCommand
      // Prevent custom args from interfering with electron-builder
      const removeArg = (arg, count) => {
        const index = rawArgs.indexOf(arg)
        if (index !== -1) rawArgs.splice(index, count)
      }
      removeArg('--mode', 2)
      removeArg('--legacy', 1)
      removeArg('--skipBundle', 1)
      // Parse the raw arguments using electron-builder yargs config
      const builderArgs = yargs
        .command(['build', '*'], 'Build', configureBuildCommand)
        .parse(rawArgs)
      //   Base config used in electron-builder build
      const defaultBuildConfig = {
        directories: {
          output: outputDir
        },
        files: [
          outputDir + '/bundled/**/*',
          'node_modules/**/*',
          'package.json'
        ],
        extends: null
      }
      //   User-defined electron-builder config, overwrites/adds to default config
      const userBuildConfig = pluginOptions.builderOptions || {}
      if (args.skipBundle) {
        console.log('Not bundling app as --skipBundle was passed')
        // Build with electron-builder
        buildApp()
      } else {
        //   Arguments to be passed to renderer build
        const vueArgs = {
          _: [],
          // For the cli-ui webpack dashboard
          dashboard: args.dashboard,
          // Make sure files are outputted to proper directory
          dest: outputDir + '/bundled',
          // Enable modern mode unless --legacy is passed
          modern: !args.legacy
        }
        //   Set the base url so that the app protocol is used
        options.baseUrl = './'
        console.log('Bundling render process:')
        //   Build the render process with the custom args
        await api.service.run('build', vueArgs)
        //   Copy fonts to css/fonts. Fixes some issues with static font imports
        if (fs.existsSync(api.resolve(outputDir + '/bundled/fonts'))) {
          fs.ensureDirSync(api.resolve(outputDir + '/bundled/css/fonts'))
          fs.copySync(
            api.resolve(outputDir + '/bundled/fonts'),
            api.resolve(outputDir + '/bundled/css/fonts')
          )
        }
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
        console.log('Bundling main process:\n')
        bundle.run((err, stats) => {
          if (err) {
            console.error(err.stack || err)
            if (err.details) {
              console.error(err.details)
            }
            process.exit(1)
          }

          const info = stats.toJson()

          if (stats.hasErrors()) {
            console.error(info.errors)
            process.exit(1)
          }

          if (stats.hasWarnings()) {
            console.warn(info.warnings)
          }

          console.log(
            stats.toString({
              chunks: false,
              colors: true
            })
          )

          buildApp()
        })
      }
      function buildApp () {
        console.log('\nBuilding app with electron-builder:\n')
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
            console.log('\nBuild complete!\n')
          })
          .catch(err => {
            // handle error
            throw err
          })
      }
    }
  )
  api.registerCommand(
    'serve:electron',
    {
      description: 'serve app and launch electron',
      usage: 'vue-cli-service serve:electron',
      details: `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    async args => {
      // Use custom config for webpack
      process.env.IS_ELECTRON = true
      const execa = require('execa')
      const mainProcessWatch = [
        mainProcessFile,
        ...(pluginOptions.mainProcessWatch || [])
      ]

      console.log('\nStarting development server:\n')
      // Run the serve command
      const server = await api.service.run('serve', {
        _: [],
        // Use dashboard if called from ui
        dashboard: args.dashboard
      })

      // Copy package.json so electron can detect app's name
      fs.copySync(api.resolve('./package.json'), `${outputDir}/package.json`)
      // Electron process
      let child
      // Function to bundle main process and start Electron
      const startElectron = () => {
        if (child) {
          // Prevent self exit on Electron process death
          child.removeAllListeners()
          // Kill old Electron process
          child.kill()
        }
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
        console.log('Bundling main process:\n')
        bundle.run((err, stats) => {
          if (err) {
            console.error(err.stack || err)
            if (err.details) {
              console.error(err.details)
            }
            process.exit(1)
          }

          const info = stats.toJson()

          if (stats.hasErrors()) {
            console.error(info.errors)
            process.exit(1)
          }

          if (stats.hasWarnings()) {
            console.warn(info.warnings)
          }

          console.log(
            stats.toString({
              chunks: false,
              colors: true
            })
          )
          if (args.debug) {
            //   Do not launch electron and provide instructions on launching through debugger
            console.log(
              '\nNot launching electron as debug argument was passed. You must launch electron though your debugger.'
            )
            console.log(
              `If you are using Spectron, make sure to set the IS_TEST env variable to true.`
            )
            console.log(
              'Learn more about debugging the main process at https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/testingAndDebugging.html#debugging.'
            )
          } else if (args.headless) {
            // Log information for spectron
            console.log(`$outputDir=${outputDir}`)
            console.log(`$WEBPACK_DEV_SERVER_URL=${server.url}`)
          } else {
            // Launch electron with execa
            console.log('\nLaunching Electron...')
            child = execa(
              require('electron'),
              // Have it load the main process file built with webpack
              [outputDir],
              {
                cwd: api.resolve('.'),
                env: {
                  ...process.env,
                  // Disable electron security warnings
                  ELECTRON_DISABLE_SECURITY_WARNINGS: true
                }
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
              //   Exit when electron is closed
              process.exit(0)
            })
          }
        })
      }
      // Initial start of Electron
      startElectron()
      // Restart on main process file change
      mainProcessWatch.forEach(file => {
        fs.watchFile(api.resolve(file), startElectron)
      })
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
    .filename(isBuild ? 'background.js' : 'index.js')
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
    config.plugin('env').use(webpack.EnvironmentPlugin, [
      {
        // Dev server url
        WEBPACK_DEV_SERVER_URL: server.url,
        // Path to node_modules (for externals in development)
        NODE_MODULES_PATH: api.resolve('./node_modules')
      }
    ])
  }
  if (args.debug) {
    // Enable source maps for debugging
    config.devtool('source-map')
  } else if (NODE_ENV === 'production') {
    // Minify for better performance
    config.plugin('uglify').use(UglifyJSPlugin, [
      {
        parallel: true
      }
    ])
  }
  config.entry('background').add(api.resolve(mainProcessFile))
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
  'serve:electron': 'development'
}
module.exports.testWithSpectron = require('./lib/testWithSpectron')
