# Scaffolding Your Project

Once the plugin is installed, use the `setup-project` generator to create the Electron "host" application. This generator will create a new project that wraps your existing frontend application.

Run the following command in your terminal:

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
