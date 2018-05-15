module.exports = (api, options) => {
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
    (args, rawArgs) => {
      api.setMode('production')
      setWebpackOptions(api, options)
      const execa = require('execa')
      const electronWebpackPath =
        api.resolve('.') + '/node_modules/.bin/electron-webpack'
      const electronBuilderPath =
        api.resolve('.') + '/node_modules/.bin/electron-builder'
      let index = rawArgs.indexOf('--webpack')
      let builderArgs
      let webpackArgs
      if (index !== -1) {
        builderArgs = rawArgs.slice(index + 1)
        webpackArgs = rawArgs.slice(0, index)
      } else {
        builderArgs = rawArgs
        webpackArgs = ''
      }
      return new Promise((resolve, reject) => {
        const child = execa(electronWebpackPath, webpackArgs, {
          cwd: api.resolve('.'),
          stdio: 'inherit'
        })
        child.on('error', err => {
          reject(err)
        })
        child.on('exit', code => {
          if (code !== 0) {
            reject(`electron-webpack exited with code ${code}.`)
          } else {
            const child = execa(electronBuilderPath, builderArgs, {
              cwd: api.resolve('.'),
              stdio: 'inherit'
            })
            child.on('error', err => {
              reject(err)
            })
            child.on('exit', code => {
              if (code !== 0) {
                reject(`electron-builder exited with code ${code}.`)
              } else {
                resolve()
              }
            })
          }
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
      api.setMode('dev')
      setWebpackOptions(api, options)
      const execa = require('execa')
      const electronWebpackPath =
        api.resolve('.') + '/node_modules/.bin/electron-webpack'
      return new Promise((resolve, reject) => {
        const child = execa(electronWebpackPath, ['dev'], {
          cwd: api.resolve('.'),
          stdio: 'inherit'
        })
        child.on('error', err => {
          reject(err)
        })
        child.on('exit', code => {
          if (code !== 0) {
            reject(`electron-webpack exited with code ${code}.`)
          } else {
            resolve
          }
        })
      })
    }
  )
}
function setWebpackOptions (api, options) {
  const fs = require('fs')
  let config
  if (
    options.pluginOptions &&
    options.pluginOptions.electronBuilder &&
    options.pluginOptions.electronBuilder.webpackConfig
  ) {
    config = options.pluginOptions.electronBuilder.webpackConfig
  } else {
    config = {}
  }
  alias = config.resolve
    ? config.resolve.alias
      ? config.resolve.alias
      : {}
    : {}
  if (!config.resolve) config.resolve = {}
  config.resolve.alias = {
    ...alias,
    ...api.resolveWebpackConfig().resolve.alias
  }
  function replacer (key, value) {
    if (value instanceof RegExp) return '__REGEXP ' + value.toString()
    else return value
  }
  function toRegex (match, p1, regex) {
    return regex.replace('\\\\', '\\')
  }
  let stringConfig = JSON.stringify(config, replacer).replace(
    /("__REGEXP)(.+?)(")(?=,?)/g,
    toRegex
  )
  if (!fs.existsSync(api.resolve('.') + '/dist_electron')) {
    fs.mkdirSync(api.resolve('.') + '/dist_electron')
  }
  fs.writeFileSync(
    api.resolve('.') + '/dist_electron/webpack.renderer.additions.js',
    'module.exports=' + stringConfig
  )
}
