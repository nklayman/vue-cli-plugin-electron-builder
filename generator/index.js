module.exports = (api, opts) => {
  api.render('./template')
  let dependencies = {
    'source-map-support': '^0.5.4'
  }
  let devDependencies = {
    'electron-builder': '^20.13.4',
    'electron-webpack': '^2.1.1',
    electron: '^2.0.1'
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
