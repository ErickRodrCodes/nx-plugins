# Building for Production

When you are ready to create a distributable package for your application, run the `dist` target:

```bash
nx dist <your-electron-app-name>
```

_(Replace `<your-electron-app-name>` with the name of your Electron host project)_.

This command uses `electron-builder` to build and package your application based on the configuration in the `electron-builder.yml` file inside your Electron host project.

The final installers and unpackaged app files will be located in the `dist/` directory at the root of your workspace.
