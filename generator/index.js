const fs = require('fs')
const semver = require('semver')
const { warn } = require('@vue/cli-shared-utils')

module.exports = (api, options = {}) => {
  if (!options.electronBuilder) options.electronBuilder = {}
  const electronVersion = options.electronBuilder.electronVersion
  let pkg = fs.readFileSync(api.resolve('./package.json'), 'utf8')
  pkg = JSON.parse(pkg)
  const usesTS = api.hasPlugin('typescript')
  const hasBackground =
    fs.existsSync(api.resolve(`./src/background.ts`)) ||
    fs.existsSync(api.resolve(`./src/background.js`))

  const devtoolsExtensionsBroken = semver.gte(
    (electronVersion || pkg.devDependencies.electron).replace('^', ''),
    '6.0.0'
  )
  if (devtoolsExtensionsBroken) {
    warn('Devtools extensions are broken in Electron 6.0.0 and greater')
    warn(
      'Vue Devtools have been disabled, see the comments in your background file for more info'
    )
  }
  if (!hasBackground) {
    // If user does not have a background file it should be created
    api.render('./templates/base', {
      // Scheme registration changed in Electron 5.0.0
      newSchemeRegistrationFunction: semver.gte(
        (electronVersion || pkg.devDependencies.electron).replace('^', ''),
        '5.0.0'
      ),
      devtoolsExtensionsBroken
    })
  }
  // Add tests
  let testFramework
  if (options.electronBuilder.addTests) {
    if (api.hasPlugin('unit-mocha')) testFramework = 'mocha'
    if (api.hasPlugin('unit-jest')) testFramework = 'jest'
    if (testFramework) api.render(`./templates/tests-${testFramework}`)
  }
  api.onCreateComplete(() => {
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
        /let win\s*?$/m,
        'let win: BrowserWindow | null'
      )
      fs.writeFileSync(api.resolve('./src/background.ts'), background)
      if (api.hasPlugin('router')) {
        console.log('\n')
        require('@vue/cli-shared-utils/lib/logger').warn(
          'It is detected that you are using Vue Router. If you are using history mode, you must push the default route when the root component is loaded. Learn more at https://goo.gl/GM1xZG .'
        )
      }
    }
  })

  // Add electron-builder install-app-deps to postinstall and postuninstall
  const scripts = {
    'electron:build': 'vue-cli-service electron:build',
    'electron:serve': 'vue-cli-service electron:serve'
  }
  const addScript = (name, command) => {
    // Add on to existing script if it exists
    if (pkg.scripts && pkg.scripts[name]) {
      // Don't re-add script
      if (!pkg.scripts[name].match(command)) {
        // add command to existing script
        scripts[name] = pkg.scripts[name] + ` && ${command}`
      } else {
        // command already exists, don't change it
        scripts[name] = pkg.scripts[name]
      }
    } else {
      // Create new postinstall script
      scripts[name] = command
    }
  }
  addScript('postinstall', 'electron-builder install-app-deps')
  addScript('postuninstall', 'electron-builder install-app-deps')
  const devDependencies = {}
  if (electronVersion) {
    // Use provided electron version
    devDependencies.electron = electronVersion
  }
  const dependencies = {}
  if (testFramework === 'mocha') {
    dependencies['chai-as-promised'] = '^7.1.1'
  }
  api.extendPackage({
    scripts,
    dependencies,
    devDependencies,
    main: 'background.js'
  })
}
