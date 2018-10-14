const fs = require('fs')

module.exports = api => {
  const usesTS = api.hasPlugin('typescript')
  const hasBackground =
    fs.existsSync(api.resolve(`./src/background.ts`)) ||
    fs.existsSync(api.resolve(`./src/background.js`))
  if (!hasBackground) {
    // If user does not have a background file so it should be created
    api.render('./template')
  }
  api.onCreateComplete(() => {
    //   Read existing index.html
    let index = fs.readFileSync(api.resolve('./public/index.html'), 'utf8')
    const tag = `<% if (BASE_URL === './') { %><base href="app://./" /><% } %>`
    if (index.indexOf(tag) === -1) {
      // Inject base tag if it doesn't exist
      index = index.replace(/^\s*?<head.*?>\s*?$/m, `  <head>\n    ${tag}`)
    }
    //   Write updated index.html
    fs.writeFileSync(api.resolve('./public/index.html'), index)

    // Update .gitignore if it exists
    if (fs.existsSync(api.resolve('./.gitignore'))) {
      let gitignore = fs.readFileSync(api.resolve('./.gitignore'), 'utf8')
      if (!gitignore.match(/(#Electron-builder output|\/dist_electron)/)) {
        //   Add /dist_electron to gitignore if it doesn't exist already
        gitignore = gitignore + '\n#Electron-builder output\n/dist_electron'
        fs.writeFileSync(api.resolve('./.gitignore'), gitignore)
      }
    }

    if (usesTS) {
      let background
      if (fs.existsSync(api.resolve('./src/background.js'))) {
        background = fs.readFileSync(api.resolve('./src/background.js'), 'utf8')
        fs.unlinkSync(api.resolve('./src/background.js'))
      } else if (fs.existsSync(api.resolve('./src/background.ts'))) {
        background = fs.readFileSync(api.resolve('./src/background.ts'), 'utf8')
      } else {
        // Exit if background file cannot be found
        return
      }
      background = background.replace(
        // Add types if they don't exist
        /process\.env\.WEBPACK_DEV_SERVER_URL\s*?\)$/m,
        'process.env.WEBPACK_DEV_SERVER_URL as string)'
      )
      background = background.replace(
        /let mainWindow\s*?$/m,
        'let mainWindow: any'
      )
      fs.writeFileSync(api.resolve('./src/background.ts'), background)
    }
  })

  // Add electron-builder install-app-deps to postinstall
  let postinstallScript
  let pkg = fs.readFileSync(api.resolve('./package.json'), 'utf8')
  pkg = JSON.parse(pkg)
  // Add on to existing script if it exists
  if (pkg.scripts && pkg.scripts.postinstall) {
    // Don't re-add script
    if (!pkg.scripts.postinstall.match('electron-builder install-app-deps')) {
      postinstallScript =
        pkg.scripts.postinstall + ' && electron-builder install-app-deps'
    } else {
      // electron-builder install-app-deps already exists
      postinstallScript = pkg.scripts.postinstall
    }
  } else {
    // Create new postinstall script
    postinstallScript = 'electron-builder install-app-deps'
  }
  api.extendPackage({
    scripts: {
      'electron:build': 'vue-cli-service electron:build',
      'electron:serve': 'vue-cli-service electron:serve',
      postinstall: postinstallScript
    },
    devDependencies: {
      electron: '^2.0.2'
    },
    main: 'background.js'
  })
}
