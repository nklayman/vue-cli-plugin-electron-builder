const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')
const Config = require('webpack-chain')
const merge = require('lodash.merge')

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
  const mainProcessTypeChecking = pluginOptions.mainProcessTypeChecking || false
  const outputDir = pluginOptions.outputDir || 'dist_electron'
  const mainProcessFile =
    pluginOptions.mainProcessFile ||
    (usesTypescript ? 'src/background.ts' : 'src/background.js')
  const mainProcessChain =
    pluginOptions.chainWebpackMainProcess || (config => config)
  const rendererProcessChain =
    pluginOptions.chainWebpackRendererProcess || (config => config)
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
      const buildRenderer = require('@vue/cli-service/lib/commands/build').build
      const fs = require('fs-extra')
      const builder = require('electron-builder')
      const mode = args.mode || pluginOptions.buildMode
      const yargs = require('yargs')
      //   Import the yargs options from electron-builder
      const configureBuildCommand = require('electron-builder/out/builder')
        .configureBuildCommand
      // Parse the raw arguments using electron-builder yargs config
      const builderArgs = yargs
        .command(['build', '*'], 'Build', configureBuildCommand)
        .parse(rawArgs)
      const rendererConfig = api.resolveChainableWebpackConfig()
      //   Configure base webpack config to work properly with electron
      rendererConfig.target('electron-renderer').output.publicPath('./')
      rendererConfig.node.set('__dirname', false).set('__filename', false)
      //   Set process.env.BASE_URL and __static to absolute file path
      rendererConfig.plugin('define').tap(args => {
        args[0]['process.env'].BASE_URL = '__dirname'
        args[0].__static = '__dirname'
        return args
      })
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
      //   Arguments to be passed to renderer build
      const vueArgs = {
        _: [],
        // For the cli-ui webpack dashboard
        dashboard: args.dashboard,
        // Make sure files are outputted to proper directory
        dest: outputDir + '/bundled',
        // Enable modern mode
        modern: true,
        // Apply mode if provided
        ...(mode ? { mode } : {})
      }
      const mainConfig = new Config()
      //   Configure main process webpack config
      mainConfig
        .mode('production')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output
        .path(api.resolve(outputDir + '/bundled'))
        .filename('background.js')
      //   Set __static to __dirname (files in public get copied here)
      mainConfig
        .plugin('define')
        .use(webpack.DefinePlugin, [{ __static: '__dirname' }])
      mainConfig.plugin('uglify').use(UglifyJSPlugin, [
        {
          parallel: true
        }
      ])
      mainConfig
        .plugin('env')
        .use(webpack.EnvironmentPlugin, [{ NODE_ENV: 'production' }])
      mainConfig.entry('background').add(api.resolve(mainProcessFile))
      if (usesTypescript) {
        mainConfig.resolve.extensions.merge(['.ts'])
        mainConfig.module
          .rule('ts')
          .test(/\.ts$/)
          .use('ts-loader')
          .loader('ts-loader')
          .options({ transpileOnly: !mainProcessTypeChecking })
      }
      //   Set the base url so that the app protocol is used
      options.baseUrl = './'
      console.log('Bundling render process:')
      //   Build the render process with the custom args and config
      await buildRenderer(
        vueArgs,
        api,
        options,
        rendererProcessChain(rendererConfig)
      )
      //   Copy fonts to css/fonts. Fixes some issues with static font imports
      if (fs.existsSync(api.resolve(outputDir + '/bundled/fonts'))) {
        fs.mkdirSync(api.resolve(outputDir + '/bundled/css/fonts'))
        fs.copySync(
          api.resolve(outputDir + '/bundled/fonts'),
          api.resolve(outputDir + '/bundled/css/fonts')
        )
      }
      //   Build the main process into the renderer process output dir
      const bundle = webpack(mainProcessChain(mainConfig).toConfig())
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
      })
    }
  )
  api.registerCommand(
    'serve:electron',
    {
      description: 'serve app and launch electron',
      usage: 'vue-cli-service serve:electron',
      details: `See https://nklayman.github.io/vue-cli-plugin-electron-builder/ for more details about this plugin.`
    },
    args => {
      const execa = require('execa')
      const serve = require('@vue/cli-service/lib/commands/serve').serve
      // --mode > headless > pluginOptions > defaults
      const mode =
        args.mode ||
        (args.headless ? 'production' : null) ||
        pluginOptions.serveMode
      console.log(mode)
      const rendererConfig = api.resolveChainableWebpackConfig()
      //   Configure renderer process to work properly with electron
      rendererConfig
        .target('electron-renderer')
        .node.set('__dirname', false)
        .set('__filename', false)
      //   Set __static to absolute path to public folder
      rendererConfig.plugin('define').tap(args => {
        args[0].__static = JSON.stringify(api.resolve('./public'))
        return args
      })
      //   Configure webpack for main process
      const mainConfig = new Config()
      mainConfig
        .mode('development')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output.path(api.resolve(outputDir)).filename('background.js')
      if (args.debug) {
        // Enable source maps for debugging
        mainConfig.devtool('source-map')
      } else {
        // Minify for better performance
        mainConfig.plugin('uglify').use(UglifyJSPlugin, [
          {
            parallel: true
          }
        ])
      }
      //   Set __static to absolute path to public folder
      mainConfig.plugin('define').use(webpack.DefinePlugin, [
        {
          __static: JSON.stringify(api.resolve('./public'))
        }
      ])
      mainConfig
        .plugin('env')
        .use(webpack.EnvironmentPlugin, [{ NODE_ENV: 'development' }])
      mainConfig.entry('background').add(api.resolve(mainProcessFile))
      if (usesTypescript) {
        mainConfig.resolve.extensions.merge(['.ts'])
        mainConfig.module
          .rule('ts')
          .test(/\.ts$/)
          .use('ts-loader')
          .loader('ts-loader')
          .options({ transpileOnly: !mainProcessTypeChecking })
      }

      console.log('\nStarting development server:\n')
      // Run the serve command with custom webpack config
      serve(
        {
          _: [],
          // Use dashboard if called from ui
          dashboard: args.dashboard,
          // Apply mode if provided
          ...(mode ? { mode } : {})
        },
        api,
        options,
        rendererProcessChain(rendererConfig)
      ).then(server => {
        // Set dev server url
        mainConfig
          .plugin('env')
          .tap(args => [{ ...args, WEBPACK_DEV_SERVER_URL: server.url }])
        //   Build the main process
        const bundle = webpack(mainProcessChain(mainConfig).toConfig())
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
            const child = execa(
              './node_modules/.bin/electron',
              // Have it load the main process file built with webpack
              [`${outputDir}/background.js`],
              {
                cwd: api.resolve('.'),
                stdio: 'inherit',
                env: {
                  ...process.env,
                  // Disable electron security warnings
                  ELECTRON_DISABLE_SECURITY_WARNINGS: true
                }
              }
            )
            child.on('exit', () => {
              //   Exit when electron is closed
              process.exit(0)
            })
          }
        })
      })
    }
  )
}
module.exports.defaultModes = {
  'build:electron': 'production',
  'serve:electron': 'development'
}
module.exports.testWithSpectron = require('./lib/testWithSpectron')
