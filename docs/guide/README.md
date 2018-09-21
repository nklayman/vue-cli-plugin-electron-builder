---
title: Quick Start
sidebarDepth: 2
---

# Quick Start

::: warning Important
Your app must be created with Vue-CLI 3 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)!
:::

::: tip Upgrade Notice
These docs are for the v1.0.0-beta release of VCP Electron Builder. If you were previously using an older version of vue-cli-plugin-electron-builder (<1.0.0), please see the [upgrade guide](./upgrading.md) or [view the old docs](https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/legacy).
:::

## Installation

Open a terminal in the directory of your app created with Vue-CLI 3.

Then, install and invoke the generator of vue-cli-plugin-electron-builder by running:

`vue add electron-builder`

That's It! You're ready to go!

## To start a Development Server

If you use [Yarn](https://yarnpkg.com/en/) (strongly recommended):

`yarn electron:serve`

or if you use NPM:

`npm run electron:serve`

## To Build Your App

With Yarn:

`yarn electron:build`

or with NPM:

`npm run electron:build`
