const fs = require('fs')
const { DefinePlugin } = require('webpack')

async function chainWebpack (api, pluginOptions, config) {
  const rendererProcessChain =
    pluginOptions.chainWebpackRendererProcess || (config => config)
  const realDirname = 'require("electron").remote.app.getAppPath()'
  if (process.env.IS_ELECTRON) {
    // Add externals
    config.externals(getExternals(api, pluginOptions))
    //   Modify webpack config to work properly with electron
    config
      .target('electron-renderer')
      .node.set('__dirname', false)
      .set('__filename', false)
    // Set IS_ELECTRON
    if (config.plugins.has('define')) {
      config.plugin('define').tap(args => {
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
      //   Set process.env.BASE_URL and __static to absolute file path
      config.plugin('define').tap(args => {
        args[0].__dirname = realDirname
        args[0].__filename = `\`\${${realDirname}}/index.html\``
        args[0]['process.env'].BASE_URL = realDirname
        args[0].__static = realDirname
        return args
      })
    } else if (process.env.NODE_ENV === 'development') {
      //   Set __static to absolute path to public folder
      config.plugin('define').tap(args => {
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
  const { dependencies } = require(api.resolve('./package.json'))
  const externalsList = Object.keys(dependencies || {}).reduce(
    (depList, dep) => {
      // Return true if we want to add a dependency to externals
      try {
        let pgkString
        for (const path of nodeModulesPaths) {
          // Check if package.json exists
          if (fs.existsSync(api.resolve(`${path}/${dep}/package.json`))) {
            // If it does, read it and break
            pgkString = fs
              .readFileSync(api.resolve(`${path}/${dep}/package.json`))
              .toString()
            break
          }
        }
        if (!pgkString) {
          throw new Error(`Could not find a package.json for module ${dep}`)
        }
        const pkg = JSON.parse(pgkString)
        const name = userExternals.find(name =>
          new RegExp(`^${pkg.name}(/|$)`).test(name)
        )
        const fields = ['main', 'module', 'jsnext:main', 'browser']
        if (
          // Not whitelisted
          userExternalsWhitelist.indexOf(dep) === -1 &&
          // Doesn't have main property
          (!fields.some(field => field in pkg) ||
            // Has binary property
            !!pkg.binary ||
            // Has gypfile property
            !!pkg.gypfile ||
            // Listed in user-defined externals list
            !!name)
        ) {
          // Use user-provided name if it exists, for subpaths
          depList.push(name || dep)
        }
      } catch (e) {
        console.log(e)
        depList.push(dep)
      }
      return depList
    },
    []
  )
  let externals = {}
  externalsList.forEach(d => {
    // Set external to be required during runtime
    externals[d] = `require("${d}")`
  })
  return externals
}
module.exports = { getExternals, chainWebpack }
