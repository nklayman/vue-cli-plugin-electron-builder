module.exports = api => {
  api.registerCommand(
    'build:electron',
    {
      description: 'build app with electron-builder',
      usage: 'vue-cli-service build:electron [options]',
      details:
        `All electron-builder and electron-webpack command line options are supported.\n` +
        `Args before --webpack will be sent to electron-builder, after --webpack will be sent to electron-webpack\n` +
        `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details.`
    },
    (args, rawArgs) => {
      api.setMode('production');

      const execa = require('execa');
      const electronWebpackPath =
        api.resolve('.') + '\\node_modules\\.bin\\electron-webpack';
      const electronBuilderPath =
        api.resolve('.') + '\\node_modules\\.bin\\electron-builder';
      let index = rawArgs.indexOf('--webpack');
      let builderArgs;
      let webpackArgs;
      if (index !== -1) {
        builderArgs = rawArgs.slice(index + 1);
        webpackArgs = rawArgs.slice(0, index);
      } else {
        builderArgs = rawArgs;
        webpackArgs = '';
      }
      return new Promise((resolve, reject) => {
        const child = execa(electronWebpackPath, webpackArgs, {
          cwd: api.resolve('.'),
          stdio: 'inherit'
        });
        child.on('error', err => {
          reject(err);
        });
        child.on('exit', code => {
          if (code !== 0) {
            reject(`electron-webpack exited with code ${code}.`);
          } else {
            const child = execa(electronBuilderPath, builderArgs, {
              cwd: api.resolve('.'),
              stdio: 'inherit'
            });
            child.on('error', err => {
              reject(err);
            });
            child.on('exit', code => {
              if (code !== 0) {
                reject(`electron-builder exited with code ${code}.`);
              } else {
                resolve();
              }
            });
          }
        });
      });
    }
  );
  api.registerCommand(
    'serve:electron',
    {
      description: 'serve app with electron-webpack',
      usage: 'vue-cli-service serve:electron',
      details: `See https://github.com/nklayman/vue-cli-plugin-electron-builder for more details.`
    },
    () => {
      api.setMode('dev');

      const execa = require('execa');
      const electronWebpackPath =
        api.resolve('.') + '\\node_modules\\.bin\\electron-webpack';
      return new Promise((resolve, reject) => {
        const child = execa(electronWebpackPath, ['dev'], {
          cwd: api.resolve('.'),
          stdio: 'inherit'
        });
        child.on('error', err => {
          reject(err);
        });
        child.on('exit', code => {
          if (code !== 0) {
            reject(`electron-webpack exited with code ${code}.`);
          } else {
            resolve;
          }
        });
      });
    }
  );
};
