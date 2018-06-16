const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')
const Config = require('webpack-chain')
module.exports = (api, options) => {
  const pluginOptions =
    options.pluginOptions && options.pluginOptions.electronBuilder
      ? options.pluginOptions.electronBuilder
      : {}
  const outputDir = pluginOptions.outputDir || 'dist_electron'
  api.registerCommand(
    'build:electron',
    {
      description: 'build app with electron-builder',
      usage:
        'vue-cli-service build:electron [electron-builder options] --webpack [electron-webpack options]',
      details:
        `All electron-builder and electron-webpack command line options are supported.\n` +
        `Args before --webpack will be sent to electron-builder, after --webpack will be sent to electron-webpack\n` +
        `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details.`
    },
    async () => {
      const buildRenderer = require('@vue/cli-service/lib/commands/build').build
      const fs = require('fs-extra')
      const builder = require('electron-builder')
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
      const userBuildConfig = pluginOptions.userBuildConfig || {}
      const mainConfig = new Config()
      mainConfig
        .mode('production')
        .devtool('source-map')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output
        .path(api.resolve(outputDir + '/bundled'))
        .filename('background.js')
      mainConfig.plugin('uglify').use(UglifyJSPlugin, [
        {
          parallel: true,
          sourceMap: true
        }
      ])
      mainConfig
        .plugin('env')
        .use(webpack.EnvironmentPlugin, [{ NODE_ENV: 'production' }])
      mainConfig.entry('background').add(api.resolve('./src/background.js'))

      console.log('Bundling render process:')
      rendererConfig.target('electron-renderer').output.publicPath('./')
      await buildRenderer(
        { _: [], dest: outputDir + '/bundled' },
        api,
        options,
        rendererConfig
      )
      if (fs.existsSync(api.resolve('./dist/fonts'))) {
        fs.mkdirSync(api.resolve('./dist/css/fonts'))
        fs.copySync(
          api.resolve(outputDir + '/bundled/fonts'),
          api.resolve(outputDir + '/bundled/css/fonts')
        )
      }
      const bundle = webpack(mainConfig.toConfig())
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
      description: 'serve app with electron-webpack',
      usage: 'vue-cli-service serve:electron',
      details: `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details.`
    },
    () => {
      const execa = require('execa')
      const mainConfig = new Config()
      mainConfig
        .mode('development')
        .devtool('source-map')
        .target('electron-main')
        .node.set('__dirname', false)
        .set('__filename', false)
      mainConfig.output.path(api.resolve(outputDir)).filename('background.js')
      mainConfig.plugin('uglify').use(UglifyJSPlugin, [
        {
          parallel: true,
          sourceMap: true
        }
      ])
      mainConfig
        .plugin('env')
        .use(webpack.EnvironmentPlugin, [{ NODE_ENV: 'development' }])
      mainConfig.entry('background').add(api.resolve('./src/background.js'))
      const bundle = webpack(mainConfig.toConfig())

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

        api.service.run('serve').then(server => {
          console.log('\nLaunching Electron...\n')
          const child = execa(
            `./node_modules/.bin/electron ${outputDir}/background.js`,
            {
              cwd: api.resolve('.'),
              stdio: 'inherit',
              env: {
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
