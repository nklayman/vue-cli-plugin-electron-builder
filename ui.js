const path = require('path')
const fs = require('fs-extra')
const prompts = require('./uiOptions')

module.exports = api => {
  const { setSharedData, removeSharedData } = api.namespace(
    'webpack-dashboard-'
  )

  let firstRun = true
  let hadFailed = false
  let modernMode = false

  // For webpack dashboard
  function resetSharedData (key) {
    setSharedData(`${key}-status`, null)
    setSharedData(`${key}-progress`, 0)
    setSharedData(`${key}-operations`, null)
    setSharedData(`${key}-stats`, null)
    setSharedData(`${key}-sizes`, null)
    setSharedData(`${key}-problems`, null)
  }

  //   For webpack dashboard
  async function onWebpackMessage ({ data: message }) {
    if (message.webpackDashboardData) {
      const type = message.webpackDashboardData.type
      for (const data of message.webpackDashboardData.value) {
        if (data.type === 'stats') {
          // Stats are read from a file
          const statsFile = path.resolve(
            process.cwd(),
            `./node_modules/.stats-${type}.json`
          )
          const value = await fs.readJson(statsFile)
          setSharedData(`${type}-${data.type}`, value)
          await fs.remove(statsFile)
        } else if (
          type.indexOf('build') !== -1 &&
          modernMode &&
          data.type === 'progress'
        ) {
          // Progress is shared between 'build' and 'build-modern'
          // 'build' first and then 'build-modern'
          const value = type === 'build' ? data.value / 2 : (data.value + 1) / 2
          // We display the same progress bar for both
          for (const t of ['build', 'build-modern']) {
            setSharedData(`${t}-${data.type}`, value)
          }
        } else {
          setSharedData(`${type}-${data.type}`, data.value)

          // Notifications
          if (type === 'serve' && data.type === 'status') {
            if (data.value === 'Failed') {
              api.notify({
                title: 'Build failed',
                message: 'The build has errors.',
                icon: 'error'
              })
              hadFailed = true
            } else if (data.value === 'Success') {
              if (hadFailed) {
                api.notify({
                  title: 'Build fixed',
                  message: 'The build succeeded.',
                  icon: 'done'
                })
                hadFailed = false
              } else if (firstRun) {
                api.notify({
                  title: 'App ready',
                  message: 'The build succeeded.',
                  icon: 'done'
                })
                firstRun = false
              }
            }
          }
        }
      }
    }
  }

  api.describeTask({
    match: /vue-cli-service build:electron/,
    description: 'Build your app for production with electron-builder',
    link:
      'https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/v1-dev#build-command',
    prompts,
    onBeforeRun: ({ answers, args }) => {
      // Args
      if (answers.dir) args.push('--dir')
      if (answers.windows) {
        args.push('--windows')
        // For each windows target, add it after --windows
        answers.windowsTargets.forEach(t => {
          args.push(t)
        })
      }
      if (answers.linux) {
        args.push('--linux')
        // For each linux target, add it after --linux
        answers.linuxTargets.forEach(t => {
          args.push(t)
        })
      }
      if (answers.macos) {
        args.push('--macos')
        // For each macos target, add it after --macos
        answers.macosTargets.forEach(t => {
          args.push(t)
        })
      }
      //   add --[arch] for each architecture target
      answers.archs.forEach(a => {
        args.push(`--${a}`)
      })
      //   Webpack dashboard
      setSharedData('modern-mode', (modernMode = !!answers.modern))
      //   Tell renderer build to send status to dashboard
      args.push('--dashboard')
      // Data
      resetSharedData('build')
      resetSharedData('build-modern')
    },
    onRun: () => {
      api.ipcOn(onWebpackMessage)
    },
    onExit: () => {
      api.ipcOff(onWebpackMessage)
    },
    views: [
      {
        id: 'vue-webpack-dashboard',
        label: 'vue-webpack.dashboard.title',
        icon: 'dashboard',
        component: 'vue-webpack-dashboard'
      },
      {
        id: 'vue-webpack-analyzer',
        label: 'vue-webpack.analyzer.title',
        icon: 'donut_large',
        component: 'vue-webpack-analyzer'
      }
    ],
    defaultView: 'vue-webpack-dashboard'
  })
  api.describeTask({
    match: /vue-cli-service serve:electron/,
    description: 'Serve your app, launch electron',
    link:
      'https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/v1-dev#serve-command',
    onBeforeRun: ({ answers, args }) => {
      // Tell dev server to send status to dashboard
      args.push('--dashboard')

      // Data
      resetSharedData('serve')
      removeSharedData('serve-url')
      firstRun = true
      hadFailed = false
    },
    onRun: () => {
      api.ipcOn(onWebpackMessage)
    },
    onExit: () => {
      api.ipcOff(onWebpackMessage)
      removeSharedData('serve-url')
    },
    views: [
      {
        id: 'vue-webpack-dashboard',
        label: 'vue-webpack.dashboard.title',
        icon: 'dashboard',
        component: 'vue-webpack-dashboard'
      }
    ],
    defaultView: 'vue-webpack-dashboard'
  })
}
