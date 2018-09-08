const fs = require('fs')

async function chainWebpack (api, pluginOptions, config) {
  const rendererProcessChain =
    pluginOptions.chainWebpackRendererProcess || (config => config)
  if (process.env.IS_ELECTRON) {
    // Add externals
    config.externals(getExternals(api, pluginOptions))
    //   Modify webpack config to work properly with electron
    config
      .target('electron-renderer')
      .node.set('__dirname', false)
      .set('__filename', false)
    if (process.env.NODE_ENV === 'production') {
      //   Set process.env.BASE_URL and __static to absolute file path
      config.plugin('define').tap(args => {
        args[0]['process.env'].BASE_URL = '__dirname'
        args[0].__static = '__dirname'
        return args
      })
      // Don't add node_modules path
      process.env.VUE_APP_NODE_MODULES_PATH = false
    } else if (process.env.NODE_ENV === 'development') {
      // Set node_modules path for externals
      process.env.VUE_APP_NODE_MODULES_PATH = api
        .resolve('./node_modules')
        .replace(/\\/g, '/')
      //   Set __static to absolute path to public folder
      config.plugin('define').tap(args => {
        args[0].__static = JSON.stringify(api.resolve('./public'))
        return args
      })
    }
    // Apply user config
    rendererProcessChain(config)
  } else {
    // Don't add node_modules path
    process.env.VUE_APP_NODE_MODULES_PATH = false
  }
}
// Find all the dependencies without a `main` property or with a `binary` property or set by user and add them as webpack externals
function getExternals (api, pluginOptions) {
  const nodeModulesPath = pluginOptions.nodeModulesPath || './node_modules'
  const userExternals = pluginOptions.externals || []
  const userExternalsWhitelist = []
  userExternals.forEach((d, i) => {
    if (d.match(/^!.*$/)) {
      userExternals.splice(i, 1)
      userExternalsWhitelist.push(d.replace(/^!/, ''))
    }
  })
  const { dependencies } = require(api.resolve('./package.json'))
  const externalsList = Object.keys(dependencies || {}).filter(dep => {
    // Return true if we want to add a dependency to externals
    try {
      const pgkString = fs
        .readFileSync(api.resolve(`${nodeModulesPath}/${dep}/package.json`))
        .toString()
      const pkg = JSON.parse(pgkString)
      const fields = ['main', 'module', 'jsnext:main', 'browser']
      return (
        // Not whitelisted
        userExternalsWhitelist.indexOf(dep) === -1 &&
        // Doesn't have main property
        (!fields.some(field => field in pkg) ||
          // Has binary property
          !!pkg.binary ||
          // Has gypfile property
          !!pkg.gypfile ||
          // Listed in user-defined externals list
          userExternals.indexOf(pkg.name) > -1)
      )
    } catch (e) {
      console.log(e)
      return true
    }
  })
  let externals = {}
  externalsList.forEach(d => {
    // Set external to be required during runtime
    externals[d] = `require("${d}")`
  })
  return externals
}
module.exports = { getExternals, chainWebpack }
