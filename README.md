# Vue CLI Plugin Electron Builder

A Vue Cli 3 plugin for Electron with no required configuration that uses [Electron Builder](https://www.electron.build/).

Win/Node 10: [![Build status](https://ci.appveyor.com/api/projects/status/tyrr8kemli4vfll7?svg=true)](https://ci.appveyor.com/project/nklayman/vue-cli-plugin-electron-builder), Linux/Node 8: [![Build Status](https://travis-ci.org/nklayman/vue-cli-plugin-electron-builder.svg?branch=master)](https://travis-ci.org/nklayman/vue-cli-plugin-electron-builder), Greenkeeper: [![Greenkeeper badge](https://badges.greenkeeper.io/nklayman/vue-cli-plugin-electron-builder.svg)](https://greenkeeper.io/)

**IMPORTANT: Your app must be created with Vue-CLI 3 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)!**

**IMPORTANT: These docs are for the v1.0.0-beta release of VCP Electron Builder. If you were previously using an older version of vue-cli-plugin-electron-builder (<1.0.0), please see the [upgrade guide](https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/upgrading.html) or [view the old docs](https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/legacy).**

## Quick Start:

Open a terminal in the directory of your app created with Vue-CLI 3.

Then, install and invoke the generator of vue-cli-plugin-electron-builder by running:

`vue add electron-builder`

That's It! You're ready to go!

### To start a development server:

If you use [Yarn](https://yarnpkg.com/en/) (strongly recommended):

`yarn serve:electron`

or if you use NPM:

`npm run serve:electron`

### To build your app:

With Yarn:

`yarn build:electron`

or with NPM:

`npm run build:electron`

To see more documentation, [visit our website](https://nklayman.github.io/vue-cli-plugin-electron-builder/).
