# Getting Started

This guide will walk you through setting up your first Electron application using `nx-electron-vite`.

## Installation

### Prerequisites

Before you begin, ensure you have the following:

1.  Node.js version 18 or higher
2.  An **Nx Workspace** using **v19 or newer** as a **monorepo** where applications and libraries are segregated in individual directories.
3.  A frontend **application project** within your workspace that you want to wrap with Electron. This could be a React, Angular, Vue, or any other framework application managed by Nx.

If you need to create a new application, you can do so with a command like `nx g @nx/react:app my-web-app`.

## Installation

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

<!--

## 2. Scaffolding the Electron Project

Next, use the `setup-project` generator to create the Electron "host" application. This generator will create a new project that wraps your existing frontend application.

Run the following command:

```bash
nx g @erickrodrcodes/nx-electron-vite:setup-project
```

The generator will launch in interactive mode and ask you for the following information:

- **The name of your guest project**: This is the existing frontend application you want to package.
- **A name for your Electron application**: This is the human-readable name, e.g., "My Awesome App".
- **The name for the new Electron project**: This will be the project name in the Nx graph, e.g., `my-awesome-app-electron`.
- **Author and Description**: Metadata for your application's `package.json`.
- **Executable Name**: The name for the final `.exe` or `.dmg` file.

Once completed, you will have a new application in your workspace configured for Electron development.

## 3. Running in Development

To run your Electron app in a live-reloading development environment, use the `electron` target that was generated for your new host project.

```bash
nx electron <your-electron-app-name>
```

_(Replace `<your-electron-app-name>` with the name of the new Electron project you created in the previous step)_.

This command does two things in parallel:

- Starts the Vite dev server for your frontend application (the renderer process).
- Starts the Electron main process, which loads your frontend app.

Hot-reloading is enabled for both processes, giving you a seamless and fast development experience.

## 4. Building for Production

When you are ready to create a distributable package, run the `dist` target:

```bash
nx dist <your-electron-app-name>
```

This command uses `electron-builder` to build and package your application based on the configuration in the `electron-builder.yml` file inside your Electron host project. The final installers and unpackaged app files will be located in the `dist/` directory at the root of your workspace. -->
