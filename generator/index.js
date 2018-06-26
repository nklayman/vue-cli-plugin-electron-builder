const fs = require('fs')

module.exports = api => {
  api.render('./template')
  //   Read existing index.html and .gitignore
  let index = fs.readFileSync(api.resolve('./public/index.html'), 'utf8')
  let gitignore = fs.readFileSync(api.resolve('./.gitignore'), 'utf8')
  //   Add base element inside <head> tag
  index = index.replace(
    /^\s*?<head.*?>\s*?$/m,
    `<head>\n    <% if (BASE_URL === './') { %><base href="app://./" /><% } %>`
  )
  //   Add /dist_electron to gitignore
  gitignore = gitignore + '\n#Electron-builder output\n/dist_electron'
  api.onCreateComplete(() => {
    //   Write updated files
    fs.writeFileSync(api.resolve('./public/index.html'), index)
    fs.writeFileSync(api.resolve('./.gitignore'), gitignore)
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
