---
title: Quick Start
sidebarDepth: 2
---

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

::: warning
The command names have changed in `v1.0.0-rc.4`. If you are using an older version, the command names are:
`yarn serve:electron`
and
`yarn build:electron`.

Replace `yarn` with `npm run` if you are using npm.
:::
