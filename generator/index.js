const fs = require('fs')

module.exports = api => {
  api.render('./template')
  api.onCreateComplete(() => {
    //   Read existing index.html and .gitignore
    let index = fs.readFileSync(api.resolve('./public/index.html'), 'utf8')
    //   Add base element inside <head> tag
    index = index.replace(
      /^\s*?<head.*?>\s*?$/m,
      `<head>\n    <% if (BASE_URL === './') { %><base href="app://./" /><% } %>
      <% if (VUE_APP_NODE_MODULES_PATH !== "false") { %><script>require('module').globalPaths.push('<%= VUE_APP_NODE_MODULES_PATH %>')</script><% } %>`
    )
    //   Write updated index.html
    fs.writeFileSync(api.resolve('./public/index.html'), index)
    // Update .gitignore if it exists
    if (fs.existsSync(api.resolve('./.gitignore'))) {
      let gitignore = fs.readFileSync(api.resolve('./.gitignore'), 'utf8')
      //   Add /dist_electron to gitignore
      gitignore = gitignore + '\n#Electron-builder output\n/dist_electron'
      fs.writeFileSync(api.resolve('./.gitignore'), gitignore)
    }
    if (api.hasPlugin('typescript')) {
      let background
      if (fs.existsSync(api.resolve('./src/background.js'))) {
        background = fs.readFileSync(api.resolve('./src/background.js'), 'utf8')
        fs.unlinkSync(api.resolve('./src/background.js'))
      } else {
        background = fs.readFileSync(api.resolve('./src/background.ts'), 'utf8')
      }
      background = background.replace(
        'process.env.WEBPACK_DEV_SERVER_URL',
        'process.env.WEBPACK_DEV_SERVER_URL as string'
      )
      background = background.replace('let mainWindow', 'let mainWindow: any')
      fs.writeFileSync(api.resolve('./src/background.ts'), background)
    }
  })
  api.extendPackage({
    scripts: {
      'build:electron': 'vue-cli-service build:electron',
      'serve:electron': 'vue-cli-service serve:electron'
    },
    devDependencies: {
      electron: '^2.0.2'
    },
    main: 'dist_electron/bundled/background.js'
  })
}
