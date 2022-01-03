const fs = require('fs')
const { DefinePlugin } = require('webpack')
const { error } = require('@vue/cli-shared-utils')

async function chainWebpack (api, pluginOptions, config) {
  const rendererProcessChain =
    pluginOptions.chainWebpackRendererProcess || ((config) => config)
  const realDirname =
    '__dirname.replace(/electron\\.asar(\\\\|\\/)renderer/, "app.asar")'
  if (process.env.IS_ELECTRON) {
    if (pluginOptions.nodeIntegration) {
      // Add externals
      config.externals(getExternals(api, pluginOptions))
      // Modify webpack config to work properly with electron
      config.target('electron-renderer')
    }
    config.node.set('__dirname', false).set('__filename', false)
    // Set IS_ELECTRON
    if (config.plugins.has('define')) {
      config.plugin('define').tap((args) => {
        args[0]['process.env'].IS_ELECTRON = true
        return args
      })
    } else {
      config.plugin('define').use(DefinePlugin, [
        {
          'process.env': { IS_ELECTRON: true }
        }
      ])
    }
    if (process.env.NODE_ENV === 'production') {
      // Set process.env.BASE_URL and __static to absolute file path
      config.plugin('define').tap((args) => {
        args[0].__dirname = realDirname
        args[0].__filename = `\`\${${realDirname}}/index.html\``
        args[0].__static = realDirname
        return args
      })
    } else if (process.env.NODE_ENV === 'development') {
      // Set __static to absolute path to public folder
      config.plugin('define').tap((args) => {
        args[0].__static = JSON.stringify(api.resolve('./public'))
        return args
      })
    }
    // Apply user config
    rendererProcessChain(config)
  }

  if (process.env.NODE_ENV === 'test') {
    // Configure for mocha-webpack
    config.module
      .rule('shebang')
      .test(/\.js$/)
      .use('shebang')
      .loader('shebang-loader')
    config.externals({
      'vue-cli-plugin-electron-builder/lib/testWithSpectron':
        'require("vue-cli-plugin-electron-builder/lib/testWithSpectron")',
      'vue-cli-plugin-electron-builder':
        'require("vue-cli-plugin-electron-builder")'
    })
  }

  // Older generated files expect this
  process.env.VUE_APP_NODE_MODULES_PATH = false
}
// Find all the dependencies without a `main` property or with a `binary` property or set by user and add them as webpack externals
function getExternals (api, pluginOptions) {
  const nodeModulesPath = pluginOptions.nodeModulesPath || './node_modules'
  let nodeModulesPaths = []
  if (Array.isArray(nodeModulesPath)) {
    // Set to user-defined array
    nodeModulesPaths = nodeModulesPath
  } else {
    // Add path to list
    nodeModulesPaths.push(nodeModulesPath)
  }
  const userExternalsWhitelist = []
  const userExternals = (pluginOptions.externals || []).filter((d, i) => {
    // if item is prefixed with "!", remove it from list and add it to userExternalsWhitelist
    if (d.match(/^!/)) {
      userExternalsWhitelist.push(d.replace(/^!/, ''))
      return false
    }
    return true
  })
  const { dependencies, optionalDependencies } = require(api.resolve(
    './package.json'
  ))
  const allDependencies = Object.keys(dependencies || {}).concat(
    Object.keys(optionalDependencies || {})
  )
  const externalsList = allDependencies.reduce((depList, dep) => {
    try {
      // If dep is in whitelist, don't add it no matter what
      if (userExternalsWhitelist.includes(dep)) {
        return depList
      }
      const name = userExternals.find((name) =>
        new RegExp(`^${dep}(/|$)`).test(name)
      )
      // If dep is listed in user external array, it is an external
      if (name) {
        // Use user-provided name if it exists to support subpaths
        depList.push(name || dep)
        return depList
      }
      for (const path of nodeModulesPaths) {
        // Check if binding.gyp exists
        if (fs.existsSync(api.resolve(`${path}/${dep}/binding.gyp`))) {
          // If it does, dep is native
          // Use user-provided name if it exists to support subpaths
          depList.push(name || dep)
          return depList
        }
      }
    } catch (e) {
      error(
        `An error occurred while trying to determine if dependecy "${dep}" is native:`,
        e
      )
      error(
        'Please manually specify the dependency in the "externals" option, prefixing with a "!" if it should not be externalized.'
      )
      error(
        'See https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/guide.html#native-modules for more details.'
      )
    }
    return depList
  }, [])
  const externals = {}
  externalsList.forEach((d) => {
    // Set external to be required during runtime
    externals[d] = `require("${d}")`
  })
  return externals
}
module.exports = { getExternals, chainWebpack }
