# Getting Started

This guide will walk you through setting up your first Electron application using `nx-electron-vite`.

## Installation

### Prerequisites

Before you begin, ensure you have the following:

1.  To ensure true compatibility with the Electron version pinned by this plugin (at the time of writing **v39.8.10**), it is recommended to use Node.js v22.21.1. (you can check the release table for stable versions of electron [here](https://releases.electronjs.org/)) While it is possible to use a greater Node version, it is not recommended as it may cause compatibility issues with some of the dependencies used by the plugin.
2.  An **Nx Workspace** using **v23 or newer** as a **monorepo** where applications and libraries are segregated in individual directories.
3.  A frontend **application project** within your workspace that you want to wrap with Electron. This could be a React, Angular, Vue, or any other framework application managed by Nx.

::: tip

If you need to create a new application, you can do so with a command like `nx g @nx/react:app my-web-app`.

:::

### Initial commands

First, add the `nx-electron-vite` plugin to your workspace:

::: code-group

```sh [npm]
npm i -D @erickrodrcodes/nx-electron-vite
```

```sh [yarn]
yarn add -D @erickrodrcodes/nx-electron-vite
```

```sh [pnpm]
pnpm add -w @erickrodrcodes/nx-electron-vite
```

```sh [nx]
nx add @erickrodrcodes/nx-electron-vite
```

:::

::: tip

When running `nx add @erickrodrcodes/nx-electron-vite` not only will add the dev dependencies required, but also will execute the `init` generator which usually runs by default when using `nx add`

:::

<!-- ::: info
Modern Build Architecture
The plugin uses a modern, non-invasive build approach that **never modifies your workspace's package.json**. All application metadata is managed through temporary configuration files that are automatically cleaned up after builds.
::: -->
