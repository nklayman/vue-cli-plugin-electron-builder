module.exports = (api, opts) => {
  api.render('./template')
  let dependencies = {
    'source-map-support': '^0.5.4'
  }
  let devDependencies = {
    'electron-builder': '^20.8.1',
    'electron-webpack': '^1.13.0',
    electron: '^1.8.4'
  }
  if (opts.useTypescript) devDependencies['electron-webpack-ts'] = '^2.0.0'
  api.extendPackage({
    scripts: {
      'build:electron': 'vue-cli-service build:electron',
      'serve:electron': 'vue-cli-service serve:electron'
    },
    dependencies,
    devDependencies,
    electronWebpack: {
      renderer: {
        sourceDirectory: 'src'
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
