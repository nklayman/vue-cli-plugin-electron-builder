module.exports = {
  title: 'VCP Electron Builder',
  description:
    'A Vue CLI 3 plugin for Electron with no required configuration.',
  base: '/vue-cli-plugin-electron-builder/',
  head: [['link', { rel: 'shortcut icon', href: '/favicon.ico' }]],
  themeConfig: {
    nav: [{ text: 'Home', link: '/' }, { text: 'Guide', link: '/guide/' }],
    sidebar: {
      '/guide/': [
        '',
        'guide',
        'configuration',
        'testingAndDebugging',
        'upgrading'
      ]
    },
    displayAllHeaders: true,
    repo: 'nklayman/vue-cli-plugin-electron-builder',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Is something wrong or missing? Edit this page on github!'
  }
}
