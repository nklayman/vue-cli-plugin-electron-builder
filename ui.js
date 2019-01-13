const prompts = require('./uiOptions')

module.exports = api => {
  api.describeTask({
    match: /vue-cli-service electron:build/,
    description: 'Build your app for production with electron-builder',
    link: 'https://nklayman.github.io/vue-cli-plugin-electron-builder/',
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
    }
  })
  api.describeTask({
    match: /vue-cli-service electron:serve/,
    description: 'Serve your app, launch electron',
    link: 'https://nklayman.github.io/vue-cli-plugin-electron-builder/'
  })
}
