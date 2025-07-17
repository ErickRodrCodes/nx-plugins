# Running in Development

To run your Electron app in a live-reloading development environment, use the `electron` target that was generated for your new host project.

```bash
nx electron <your-electron-app-name>
```

_(Replace `<your-electron-app-name>` with the name of the new Electron project you created)_.

This command does two things in parallel:

- Starts the Vite dev server for your frontend application (the renderer process).
- Starts the Electron main process, which loads your frontend app.

Hot-reloading is enabled for both processes, giving you a seamless and fast development experience.
