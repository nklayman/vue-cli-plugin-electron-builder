const { defaultPreset } = require('@vue/cli/lib/options')
const create = require('@vue/cli-test-utils/createTestProject')
const path = require('path')
const fs = require('fs-extra')

const createProject = (projectName, useTS, customPlugins = {}) =>
  new Promise(async resolve => {
    //   Prevent modification of import
    let preset = { ...defaultPreset }
    if (useTS) {
      // Install typescript plugin
      preset.plugins['@vue/cli-plugin-typescript'] = {}
      //   Use different project name
      projectName += '-ts'
    }
    // Install vcp-electron-builder
    preset.plugins['vue-cli-plugin-electron-builder'] = {}
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
      "const isDevelopment = process.env.NODE_ENV !== 'production'",
      `const isDevelopment = process.env.NODE_ENV !== 'production'
      ${useTS ? 'declare var __static: string' : ''}
        console.log('__static=' + __static)`
    )
    // Have render process log __static and BASE_URL to console to make sure they are correct
    mainFile = mainFile.replace(
      "import App from './App.vue'",
      `import App from './App.vue'
      ${useTS ? 'declare var __static: string' : ''}
      console.log('process.env.BASE_URL=' + process.env.BASE_URL)
      console.log('__static=' + __static )`
    )
    fs.writeFileSync(
      projectPath(`src/background.${useTS ? 'ts' : 'js'}`),
      backgroundFile
    )
    fs.writeFileSync(projectPath(`src/main.${useTS ? 'ts' : 'js'}`), mainFile)
    resolve({ project, projectName })
  })

module.exports = createProject
