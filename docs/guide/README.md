---
title: Quick Start
sidebarDepth: 2
---

:::warning
These are the docs for the v2.0-rc release line, which is recommended over the v1.x version. The old docs are available [here](https://github.com/nklayman/vue-cli-plugin-electron-builder/tree/v1/docs). To upgrade, see the [release announcement](https://github.com/nklayman/vue-cli-plugin-electron-builder/releases/tag/v2.0.0-rc.1).
:::

# Quick Start

::: warning Important
Your app must be created with Vue-CLI 3 or 4 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)!
:::

## Installation

Open a terminal in the directory of your app created with Vue-CLI 3 or 4 (4 is recommended).

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
