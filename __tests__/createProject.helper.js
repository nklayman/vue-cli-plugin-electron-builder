const { defaultPreset } = require('@vue/cli/lib/options')
const create = require('@vue/cli-test-utils/createTestProject')
const path = require('path')
const fs = require('fs-extra')

// Prevent electron-builder from installing app deps
jest.mock('electron-builder/out/cli/install-app-deps.js')

const createProject = async (projectName, useTS, customPlugins = {}) => {
  // Prevent modification of import
  const preset = {
    ...defaultPreset,
    configs: {
      vue: { lintOnSave: false }
    }
  }
  if (useTS) {
    // Install typescript plugin
    preset.plugins['@vue/cli-plugin-typescript'] = {}
    // Use different project name
    projectName += '-ts'
  }
  // Install vcp-electron-builder
  preset.plugins['vue-cli-plugin-electron-builder'] = {
    // electron-builder requires that an exact version of electron is provided,
    // unless electron is already installed
    version: 'file:' + process.cwd(),
    electronBuilder: { electronVersion: '13.0.0' }
  }
  preset.plugins = { ...preset.plugins, ...customPlugins }
  const projectPath = (p) =>
    path.join(process.cwd(), '__tests__/projects/' + projectName, p)
  const project = await create(
    projectName,
    preset,
    path.join(process.cwd(), '/__tests__/projects')
  )
  let backgroundFile = fs.readFileSync(
    projectPath(`src/background.${useTS ? 'ts' : 'js'}`),
    'utf8'
  )
  let mainFile = fs.readFileSync(
    projectPath(`src/main.${useTS ? 'ts' : 'js'}`),
    'utf8'
  )
  // Have main process log __static to console to make sure it is correct
  backgroundFile = backgroundFile
    .replace(
      `let mainWindow${useTS ? ': any' : ''}`,
      `let mainWindow${useTS ? ': any' : ''}
      ${useTS ? 'declare var __static: string' : ''}`
    )
    .replace(
      'if (process.env.WEBPACK_DEV_SERVER_URL) {',
      `
        console.log('__static=' + __static)
        console.log('mockExternalPath=' + require.resolve('mockExternal'))
        if (process.env.WEBPACK_DEV_SERVER_URL) {`
    )
    // Spectron requires the remote module to be enabled
    .replace('webPreferences: {', 'webPreferences: {enableRemoteModule:true,')
  // Have render process log __static and BASE_URL to console to make sure they are correct
  mainFile = mainFile.replace(
    "import App from './App.vue'",
    `import App from './App.vue'
      ${useTS ? 'declare var __static: string' : ''}
      window.BASE_URL = process.env.BASE_URL
      window.__static = __static 
      window.vuePath = require.resolve('vue')
      window.mockExternalPath = require.resolve('mockExternal')`
  )
  fs.writeFileSync(
    projectPath(`src/background.${useTS ? 'ts' : 'js'}`),
    backgroundFile
  )
  fs.writeFileSync(projectPath(`src/main.${useTS ? 'ts' : 'js'}`), mainFile)

  // So we can test Vue isn't in externals
  const vuePkg = { main: 'dist/vue.esm.js' }
  fs.ensureDirSync(projectPath('node_modules/vue'))
  fs.writeFileSync(
    projectPath('node_modules/vue/package.json'),
    JSON.stringify(vuePkg, null, 2)
  )

  // Add a fake package that should be an external
  const externalPkg = {
    binary: { msg: 'because of this field, it will be marked as an external' }
  }
  fs.ensureDirSync(projectPath('node_modules/mockExternal'))
  fs.writeFileSync(
    projectPath('node_modules/mockExternal/package.json'),
    JSON.stringify(externalPkg, null, 2)
  )
  // Add mockExternal to app's package.json so that it is detected as external
  const appPkg = JSON.parse(
    fs.readFileSync(projectPath('package.json'), 'utf8')
  )
  appPkg.dependencies.mockExternal = 'mockExternal'
  // Enable nodeIntegration
  appPkg.vue.pluginOptions = { electronBuilder: { nodeIntegration: true } }
  fs.writeFileSync(projectPath('package.json'), JSON.stringify(appPkg, null, 2))

  return { project, projectName }
}

module.exports = createProject
