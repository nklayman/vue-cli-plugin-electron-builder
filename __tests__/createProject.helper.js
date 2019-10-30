const { defaultPreset } = require('@vue/cli/lib/options')
const create = require('@vue/cli-test-utils/createTestProject')
const path = require('path')
const fs = require('fs-extra')

// Prevent electron-builder from installing app deps
jest.mock('electron-builder/out/cli/install-app-deps.js')

const createProject = (projectName, useTS, customPlugins = {}) =>
  new Promise(async resolve => {
    //   Prevent modification of import
    let preset = {
      ...defaultPreset,
      configs: {
        vue: { lintOnSave: false }
      }
    }
    if (useTS) {
      // Install typescript plugin
      preset.plugins['@vue/cli-plugin-typescript'] = {}
      //   Use different project name
      projectName += '-ts'
    }
    // Install vcp-electron-builder
    preset.plugins['vue-cli-plugin-electron-builder'] = {
      // electron-builder requires that an exact version of electron is provided,
      // unless electron is already installed
      electronBuilder: { electronVersion: '7.0.0' }
    }
    preset.plugins = { ...preset.plugins, ...customPlugins }
    const projectPath = p =>
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
    backgroundFile = backgroundFile.replace(
      `let mainWindow${useTS ? ': any' : ''}`,
      `let mainWindow${useTS ? ': any' : ''}
      ${useTS ? 'declare var __static: string' : ''}
        console.log('__static=' + __static)
        console.log('mockExternalPath=' + require.resolve('mockExternal'))`
    )
    // Have render process log __static and BASE_URL to console to make sure they are correct
    mainFile = mainFile.replace(
      "import App from './App.vue'",
      `import App from './App.vue'
      ${useTS ? 'declare var __static: string' : ''}
      console.log('process.env.BASE_URL=' + process.env.BASE_URL)
      console.log('__static=' + __static )
      console.log('vuePath=' + require.resolve('vue'))
      console.log('mockExternalPath=' + require.resolve('mockExternal'))`
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
      JSON.stringify(vuePkg)
    )

    // Add a fake package that should be an external
    const externalPkg = {
      binary: 'because of this field, it will be marked as an external'
    }
    fs.ensureDirSync(projectPath('node_modules/mockExternal'))
    fs.writeFileSync(
      projectPath('node_modules/mockExternal/package.json'),
      JSON.stringify(externalPkg)
    )
    // Add mockExternal to app's package.json so that it is detected as external
    const appPkg = JSON.parse(
      fs.readFileSync(projectPath('package.json'), 'utf8')
    )
    appPkg.dependencies.mockExternal = 'mockExternal'
    fs.writeFileSync(projectPath('package.json'), JSON.stringify(appPkg))

    resolve({ project, projectName })
  })

module.exports = createProject
