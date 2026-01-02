# What is Nx Electron Vite?

`nx-electron-vite` is a plugin that seamlessly integrates Electron development into your Nx workspace. It allows you to take an existing frontend application from your monorepo and wrap it in a desktop application shell, ready for distribution on Windows, macOS, and Linux.

It's designed to be framework-agnostic, meaning you can use it with React, Angular, Vue, or any other web framework supported by Nx.

For a deeper dive into the plugin's design, motivations, and core concepts, please see the [Architecture Pattern](./architecture-pattern.md) page.

## Key Features

The `nx-electron-vite` plugin is engineered to provide a first-class developer experience within an Nx monorepo.

- **Vite Integration**: Utilizes Vite for both the main and renderer processes, enabling Hot Module Replacement (HMR) for a faster development cycle.
- **Simplified Monorepo Management**: The plugin leverages the Nx project graph to seamlessly connect your Electron host application to its corresponding frontend guest application. This allows you to manage multiple, independent Electron apps within a single monorepo, each tied to a specific frontend project, without complex configuration.
- **Effortless Debugging**: Debug both the main and renderer processes directly from your IDE. The setup is configured out-of-the-box to attach debuggers (like the one in VS Code), allowing you to set breakpoints and inspect code with ease.
- **Easy implementation of Native Modules**: Through the generator `build-native` it creates the right flow for your `.node` files without creating complex implementations on your codebase at the moment of build.

## Performance

`nx-electron-vite` is built for performance, leveraging the strengths of both Vite and Nx to optimize your workflow.

- **Fast Development Server**: Powered by Vite, the plugin provides a responsive development experience with Hot Module Replacement (HMR) for both the renderer and main processes.
- **Computation Caching**: As a native Nx plugin, it takes full advantage of Nx's computation cache. Builds, tests, and other operations are cached, meaning they only re-run when the code has actually changed, saving significant time during local development and in CI/CD pipelines.
