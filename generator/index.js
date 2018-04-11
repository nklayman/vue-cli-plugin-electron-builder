module.exports = api => {
  api.render('./template');
  api.extendPackage({
    scripts: {
      'build:electron': 'vue-cli-service build:electron',
      'serve:electron': 'vue-cli-service serve:electron'
    },
    devDependencies: {
      'electron-builder': '^20.8.1',
      'electron-webpack': '^1.13.0',
      electron: '^1.8.4'
    },
    electronWebpack: {
      renderer: {
        sourceDirectory: 'src'
      }
    },
    build: {
      directories: {
        app: './',
        output: 'dist_electron'
      },
      files: ['dist/**/*', 'node_modules/**/*', 'package.json']
    }
  });
};
