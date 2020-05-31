const execa = require('execa')
const List = require('terminal-tasks')
const list = new List([
  'Build With Vuepress',
  'Git Init',
  'Git Add',
  'Git Commit',
  'Git Push'
])
const deploy = async () => {
  // Build docs
  await execa('yarn', ['docs:build'], {})
  list.next()

  // Push to github
  await execa('git', ['init'], {
    cwd: './docs/.vuepress/dist'
  })
  list.next()

  await execa('git', ['add', '-A'], {
    cwd: './docs/.vuepress/dist'
  })
  list.next()

  await execa('git', ['commit', '-m', 'deploy'], {
    cwd: './docs/.vuepress/dist'
  })
  list.next()

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
}
deploy().then(() => {
  list.complete('Deploy Complete!')
})
