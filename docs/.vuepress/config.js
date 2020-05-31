module.exports = {
  title: 'Vue CLI Plugin Electron Builder',
  description: 'Instantly Add Electron to Your Vue.js App',
  base: '/vue-cli-plugin-electron-builder/',
  ga: 'UA-134189455-2',
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
        text: 'v1.x',
        link:
          'https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/v1'
      },
      {
        text: 'Changelog',
        link:
          'https://github.com/nklayman/vue-cli-plugin-electron-builder/releases'
      },
      {
        text: 'Sponsor',
        link: 'https://github.com/sponsors/nklayman'
      }
    ],
    sidebar: {
      '/guide/': [
        '',
        'guide',
        'configuration',
        'recipes',
        'security',
        'testingAndDebugging',
        'commonIssues'
      ]
    },
    repo: 'nklayman/vue-cli-plugin-electron-builder',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Is something wrong or missing? Edit this page on github!'
  }
}
