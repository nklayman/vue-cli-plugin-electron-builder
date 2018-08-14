module.exports = {
  title: 'Vue CLI Plugin Electron Builder',
  description:
    'A Vue CLI 3 plugin for Electron with no required configuration.',
  base: '/vue-cli-plugin-electron-builder/',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    // Google search property verification
    [
      'meta',
      {
        name: 'google-site-verification',
        content: 'It9QDm7l8m-gYoVuBFVzERjx0MapaegfY1AMru9wFCc'
      }
    ]
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      {
        text: 'Changelog',
        link:
          'https://github.com/nklayman/vue-cli-plugin-electron-builder/releases'
      }
    ],
    sidebar: {
      '/guide/': [
        '',
        'guide',
        'configuration',
        'testingAndDebugging',
        'upgrading'
      ]
    },
    repo: 'nklayman/vue-cli-plugin-electron-builder',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Is something wrong or missing? Edit this page on github!'
  }
}
