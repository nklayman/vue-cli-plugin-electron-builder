const execa = require('execa')
const deploy = () =>
  new Promise(async resolve => {
    // Build docs
    await execa('yarn', ['docs:build'], {
      stdio: 'inherit'
    })

    // Push to github
    await execa('git', ['init'], {
      stdio: 'inherit',
      cwd: './docs/.vuepress/dist'
    })
    await execa('git', ['add', '-A'], {
      stdio: 'inherit',
      cwd: './docs/.vuepress/dist'
    })
    await execa('git', ['commit', '-m', 'deploy'], {
      stdio: 'inherit',
      cwd: './docs/.vuepress/dist'
    })
    await execa(
      'git',
      [
        'push',
        '-f',
        'https://github.com/nklayman/vue-cli-plugin-electron-builder.git',
        'master:gh-pages'
      ],
      {
        cwd: './docs/.vuepress/dist'
      }
    )
    resolve()
  })
deploy().then(() => {
  console.log('Deploy Complete')
})
