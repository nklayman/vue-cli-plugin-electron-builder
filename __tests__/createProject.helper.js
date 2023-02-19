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
    electronBuilder: { electronVersion: '17.0.0', addTests: true }
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
  // Have main process log __static and mockExternalPath via IPC to make sure it is correct
  backgroundFile = backgroundFile
    .replace(
      '\'use strict\'',
      '/* global __static */\n\'use strict\'')
    .replace(
      'import { app, protocol, BrowserWindow } from \'electron\'',
      'import { app, protocol, BrowserWindow, ipcMain } from \'electron\'')
    .replace( // ToDo: adapt to Vue2/3
      'import installExtension, { VUEJS_DEVTOOLS } from \'electron-devtools-installer\'',
      `import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'`
    )
    .replace(
      'const isDevelopment = process.env.NODE_ENV !== \'production\'',
      `${useTS ? 'declare var __static: string\n' : ''}const isDevelopment = process.env.NODE_ENV !== 'production'`
    )
    .replace(
      'webPreferences: {',
      `webPreferences: {
      preload: path.join(__dirname, 'preload.${useTS ? 'ts' : 'js'}'),`
    )
    .concat(
      'let rendererPromiseResolve\n',
      'const renderer_data_promise = new Promise((resolve) => {\n',
      ' rendererPromiseResolve = resolve\n',
      '})\n',
      '\n',
      'ipcMain.handle(\'renderer-data-to-main\', (event, data) => {\n',
      '  rendererPromiseResolve(data)\n',
      '})\n',
      '\n',
      'ipcMain.handle(\'get-renderer-data\', async () => {\n',
      '  // Wait for received window data\n',
      '  return await renderer_data_promise\n',
      '})\n',
      '',
      'ipcMain.handle(\'get-main-data\', () => {\n',
      '  return [__static,require.resolve(\'mockExternal\')]\n',
      '})\n'
    )

  // Have render process log __static and BASE_URL via IPC to make sure they are correct
  mainFile = mainFile
    .replace(
      'import Vue from \'vue\'',
      '/* global __static */\nimport Vue from \'vue\''
    )
    .replace(
      'import App from \'./App.vue\'',
      `import App from './App.vue'
${useTS ? 'declare var __static: string' : ''}
window.__static = __static
window.vuePath = require.resolve('vue')
window.mockExternalPath = require.resolve('mockExternal')
window.BASE_URL = process.env.BASE_URL

const getData = function() {
  return [window.__static,window.vuePath,window.mockExternalPath,window.BASE_URL]
}
const send_data = async (data) => {
  await window.send_data(data)
}
send_data(getData())`
    )

  const preloadFile = ''
    .concat(
      'const { ipcRenderer } = require(\'electron\')\n',
      '\n',
      'window.send_data = (data) => ipcRenderer.invoke(\'renderer-data-to-main\', data)\n'
    )
  fs.writeFileSync(
    projectPath(path.join('src', `background.${useTS ? 'ts' : 'js'}`)),
    backgroundFile
  )
  fs.writeFileSync(projectPath(path.join('src', `main.${useTS ? 'ts' : 'js'}`)), mainFile)

  fs.writeFileSync(projectPath(path.join('src', `preload.${useTS ? 'ts' : 'js'}`)), preloadFile)

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
  // Enable nodeIntegration and add preload file
  appPkg.vue.pluginOptions = { electronBuilder: { nodeIntegration: true, preload: path.join('src', `preload.${useTS ? 'ts' : 'js'}`)} }
  fs.writeFileSync(projectPath('package.json'), JSON.stringify(appPkg, null, 2))

  return { project, projectName }
}

module.exports = createProject
