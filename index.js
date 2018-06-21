const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')
const Config = require('webpack-chain')
module.exports = (api, options) => {
  const pluginOptions =
    options.pluginOptions && options.pluginOptions.electronBuilder
      ? options.pluginOptions.electronBuilder
      : {}
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
  api.registerCommand(
    'build:electron',
    {
      description: 'build app with electron-builder',
      usage: 'vue-cli-service build:electron [electron-builder options]',
      details:
        `All electron-builder command line options are supported.\n` +
        `See https://www.electron.build/cli for cli options\n` +
        `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details about this plugin.`
    },
    async (args, rawArgs) => {
      const buildRenderer = require('@vue/cli-service/lib/commands/build').build
      const fs = require('fs-extra')
      const builder = require('electron-builder')
      const yargs = require('yargs')
      const configureBuildCommand = require('electron-builder/out/builder')
        .configureBuildCommand
      const builderArgs = yargs
        .command(['build', '*'], 'Build', configureBuildCommand)
        .parse(rawArgs)
      const rendererConfig = api.resolveChainableWebpackConfig()
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
      const vueArgs = {
        _: [],
        dashboard: args.dashboard,
        dest: outputDir + '/bundled'
      }
      const userBuildConfig = pluginOptions.builderOptions || {}
      const mainConfig = new Config()
      mainConfig
        .mode('production')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output
        .path(api.resolve(outputDir + '/bundled'))
        .filename('background.js')
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

      console.log('Bundling render process:')
      rendererConfig.target('electron-renderer').output.publicPath('./')
      rendererConfig.node.set('__dirname', false).set('__filename', false)
      await buildRenderer(vueArgs, api, options, rendererConfig)
      if (fs.existsSync(api.resolve(outputDir + '/bundled/fonts'))) {
        fs.mkdirSync(api.resolve(outputDir + '/bundled/css/fonts'))
        fs.copySync(
          api.resolve(outputDir + '/bundled/fonts'),
          api.resolve(outputDir + '/bundled/css/fonts')
        )
      }
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

        builder
          .build({
            ...builderArgs,
            config: {
              ...defaultBuildConfig,
              ...userBuildConfig
            }
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
      details: `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details about this plugin.`
    },
    args => {
      const execa = require('execa')
      const serve = require('@vue/cli-service/lib/commands/serve').serve
      const rendererConfig = api.resolveChainableWebpackConfig()
      rendererConfig
        .target('electron-renderer')
        .node.set('__dirname', false)
        .set('__filename', false)
      const mainConfig = new Config()
      mainConfig
        .mode('development')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output.path(api.resolve(outputDir)).filename('background.js')
      mainConfig.plugin('uglify').use(UglifyJSPlugin, [
        {
          parallel: true
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

        console.log('\nStarting development server:\n')

        serve(
          { _: [], dashboard: args.dashboard },
          api,
          options,
          rendererConfig
        ).then(server => {
          console.log('\nLaunching Electron...\n')
          const child = execa(
            `./node_modules/.bin/electron ${outputDir}/background.js`,
            {
              cwd: api.resolve('.'),
              stdio: 'inherit',
              env: {
                ...process.env,
                WEBPACK_DEV_SERVER_URL: server.url
              }
            }
          )
          child.on('exit', () => {
            process.exit(0)
          })
        })
      })
    }
  )
}
module.exports.defaultModes = {
  'build:electron': 'production',
  'serve:electron': 'development'
}
