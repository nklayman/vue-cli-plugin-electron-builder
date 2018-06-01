module.exports = (api, opts) => {
  api.render('./template')
  let dependencies = {
    'source-map-support': '^0.5.4'
  }
  let devDependencies = {
    'electron-builder': '^20.14.7',
    'electron-webpack': '^2.1.2',
    electron: '^2.0.2'
  }
  if (opts.useTypescript) devDependencies['electron-webpack-ts'] = '^2.0.2'
  api.extendPackage({
    scripts: {
      'build:electron': 'vue-cli-service build:electron',
      'serve:electron': 'vue-cli-service serve:electron'
    },
    dependencies,
    devDependencies,
    electronWebpack: {
      renderer: {
        sourceDirectory: 'src',
        webpackConfig: 'dist_electron/webpack.renderer.additions.js'
      },
      main: {
        webpackConfig: 'dist_electron/webpack.main.additions.js'
      }
    },
    build: {
      directories: {
        output: 'dist_electron'
      },
      files: ['dist/**/*', 'node_modules/**/*', 'package.json']
    }
  })
}
