module.exports = api => {
  api.render('./template')
  api.extendPackage({
    scripts: {
      'build:electron': 'vue-cli-service build:electron',
      'serve:electron': 'vue-cli-service serve:electron'
    },
    devDependencies: {
      electron: '^2.0.2'
    },
    main: 'dist/background.js'
  })
}
