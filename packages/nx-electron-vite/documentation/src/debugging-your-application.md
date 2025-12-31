# Debugging Your Application

The `nx-electron-vite` plugin provides built-in debugging support for both the main process (Node.js) and renderer process (Chromium) of your Electron application.

## Quick Setup

When you scaffold a project with `nx-electron-vite`, debugging is pre-configured with default ports:

- **Main Process**: Port `5858` (Node.js debugging)
- **Renderer Process**: Port `4975` (Chrome DevTools Protocol)

These ports can be customized in your project's `electron-nx-vite.config.ts` file or through environment variables in the `.env` file.

## VS Code Debugging Setup

After scaffolding your project, you'll find a `debugme.md` file in your Electron project root with project-specific debugging configurations. This section explains the general concepts and configurations you'll need to understand.

**💡 Tip**: Check your project's `debugme.md` file first for exact configurations tailored to your setup.

### Launch Configuration

Create or update your `.vscode/launch.json` file with the following configuration:

::: code-group

```json [launch.json]
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Electron Main - [your-project]",
      "type": "node",
      "request": "attach",
      "port": 5858,
      "restart": true,
      "skipFiles": ["<node_internals>/**"],
      "presentation": {
        "hidden": true,
        "group": "",
        "order": 1
      }
    },
    {
      "name": "Attach to Electron Renderer - [your-project]",
      "type": "pwa-chrome",
      "request": "attach",
      "port": 4975,
      "webRoot": "${workspaceFolder}",
      "presentation": {
        "hidden": true,
        "group": "",
        "order": 1
      }
    }
  ],
  "compounds": [
    {
      "name": "Debug [your-project]",
      "configurations": ["Attach to Electron Main - [your-project]", "Attach to Electron Renderer - [your-project]"],
      "preLaunchTask": "start-electron-dev"
    }
  ]
}
```

:::

Replace `[your-project]` with your actual Electron project name.

### Task Configuration (Recommended)

To enable automatic startup of your Electron app when debugging, create or update `.vscode/tasks.json`:

::: code-group

```json [tasks.json]
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "shell",
      "label": "start-electron-dev",
      "command": "pnpm exec nx run [your-project]:electron",
      "isBackground": true,
      "problemMatcher": {
        "owner": "custom",
        "pattern": [
          {
            "regexp": ".",
            "file": 1,
            "location": 2,
            "message": 0
          }
        ],
        "background": {
          "activeOnStart": true,
          "beginsPattern": "🚀 Starting Electron with main path:",
          "endsPattern": "ready in"
        }
      },
      "detail": "Start Electron development server"
    }
  ]
}
```

:::

**⚠️ IMPORTANT CONFIGURATION NOTES**

#### Package Manager Configuration

The example above uses `pnpm exec nx run` in the command. **Adjust this based on your package manager**:

- **pnpm**: `pnpm exec nx run [your-project]:electron`
- **npm**: `npx nx run [your-project]:electron`
- **yarn**: `yarn nx run [your-project]:electron`

Since this is a general example, you must update the command to match your package manager.

#### Understanding `endsPattern` - Critical for Debugging

The `endsPattern` tells VS Code when your application is fully ready for debugging. This is crucial because:

1. **VS Code waits** for this pattern to appear in the terminal output
2. **Only then** does it attach the debuggers to both processes
3. **If the pattern is wrong**, debuggers won't attach before your app is ready, causing connection failures

::: warning
Note that the following patterns might change in the future, so it is recommended to check the output consoles of your frontend application to find the correct pattern.
:::

**Choose the correct pattern for your frontend framework**:

| Framework        | Pattern                                    | What it means                         |
| ---------------- | ------------------------------------------ | ------------------------------------- |
| Angular          | `"Angular is running in development mode"` | Angular dev server is ready           |
| React (CRA/Vite) | `"ready in"`                               | Vite dev server has started           |
| Vue              | `"ready in"`                               | Vite dev server has started           |
| Custom/Other     | Check your terminal output                 | Look for a consistent "ready" message |

**How to find your pattern**: Run `nx serve [guest-frontend-application]` manually and look for the message that appears when the frontend dev server is ready.

## Debugging Workflow

### Start Debugging Session

The `nx-electron-vite` plugin is designed for **integrated debugging** of both main and renderer processes simultaneously.

#### Integrated Debugging (Main + Renderer)

- Open the **Run and Debug** panel (`Ctrl+Shift+D`)
- Select **"Debug [your-project]"** from the dropdown
- Click the play button or press `F5`

This will automatically:

1. Start your Electron application in development mode (via the pre-launch task)
2. Attach debuggers to both main and renderer processes simultaneously
3. Open your application ready for full-stack debugging

**Why integrated debugging?** This approach allows you to:

- Debug communication between main and renderer processes
- Set breakpoints in both frontend and backend code
- Step through the entire application flow seamlessly
- Understand the complete electron application architecture

### Set Breakpoints

- **Main Process**: Set breakpoints in your `src/main/main.ts` and related files
- **Renderer Process**: Set breakpoints in your frontend application code

## Multiple Electron Applications

In a large monorepo with multiple Electron applications, each app can have its own debugging configuration:

1. **Use different ports** for each application
2. **Create separate debug configurations** in `launch.json`
3. **Set up individual compounds** for each app

Example for multiple apps:

::: code-group

```json [launch.json - Multiple Apps]
{
  "version": "0.2.0",
  "configurations": [
    // App 1
    {
      "name": "Attach to Main - App1",
      "type": "node",
      "request": "attach",
      "port": 5858
    },
    {
      "name": "Attach to Renderer - App1",
      "type": "pwa-chrome",
      "request": "attach",
      "port": 4975
    },
    // App 2
    {
      "name": "Attach to Main - App2",
      "type": "node",
      "request": "attach",
      "port": 5859
    },
    {
      "name": "Attach to Renderer - App2",
      "type": "pwa-chrome",
      "request": "attach",
      "port": 4976
    }
  ],
  "compounds": [
    {
      "name": "Debug App1",
      "configurations": ["Attach to Main - App1", "Attach to Renderer - App1"]
    },
    {
      "name": "Debug App2",
      "configurations": ["Attach to Main - App2", "Attach to Renderer - App2"]
    }
  ]
}
```

:::

## Alternative Debugging Methods

### Chrome DevTools (Renderer Process)

1. Start your Electron app in development
2. Open Chrome and navigate to `chrome://inspect`
3. Click "inspect" next to your Electron renderer process

### Node.js Inspector (Main Process)

1. Start your Electron app in development
2. Open Chrome and navigate to `chrome://inspect`
3. Click "inspect" next to the Node.js process

### Electron DevTools

Access Electron's built-in developer tools:

```javascript
// In your main process
const { BrowserWindow } = require('electron');

const win = new BrowserWindow({
  // ... window options
});

// Open DevTools in development
if (process.env.NODE_ENV === 'development') {
  win.webContents.openDevTools();
}
```

## Troubleshooting

### Common Issues

**Port Already in Use**

- Check if another process is using the debugging ports
- Change the ports in your configuration files

**Debugger Won't Attach**

- Ensure the Electron app is running in development mode
- Verify the ports match between your app and VS Code configuration
- Check that the debugging flags are enabled in your Vite configuration

**Breakpoints Not Hitting**

- Ensure source maps are enabled in development
- Verify the file paths in your debugger configuration
- Check that you're debugging the correct process (main vs renderer)

### Key Configuration Files

The debugging setup involves these files in your project:

- **`debugme.md`** - Project-specific debugging guide with exact configurations (start here!)
- **`electron-nx-vite.config.ts`** - Main Electron configuration including debug port settings
- **`.env`** - Environment variables for customizing debug ports

## Next Steps

Now that you can debug your application effectively, you might want to explore:

- [Production Builds](/production-builds) for creating distributable applications
- [Native Module Integration](/generators/build-native) for adding native dependencies
