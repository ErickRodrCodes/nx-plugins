# Development Workflow

After scaffolding your project, you're ready to start developing. The `nx-electron-vite` plugin provides several targets to run your application in different modes.

## Quick Start

To start developing your Electron application, use the primary `electron` target:

::: code-group

```bash [nx]
nx electron <your-electron-app-name>
```

:::

This command automatically starts both your frontend application and Electron shell with hot-reloading enabled.

## Available Development Targets

The plugin configures several targets for different development scenarios:

| Target                     | Purpose                                                            | When to Use                         |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| `electron`                 | **Primary development** - Runs both frontend and Electron together | Regular development workflow        |
| `serve`                    | **Host-only** - Runs just the Electron main process                | Debugging main process in isolation |
| `nx serve <guest-project>` | **Frontend-only** - Runs just your web app                         | Frontend development and testing    |

**Most of the time, you'll use `nx electron <project-name>` for development.**

## Hot-Reloading & Development Experience

The development workflow provides:

- **Frontend hot-reloading**: Changes to your web app update instantly in the Electron window
- **Main process restart**: Changes to Electron code automatically restart the app
- **IDE debugging**: Debug both frontend and main process with breakpoints
- **Framework-native experience**: Your frontend framework's dev tools work normally

## Technical Details

<details>
<summary>Click to expand technical implementation details</summary>

### Understanding the Development Orchestration

When you run `nx electron <project-name>`, the plugin executes a sophisticated parallel workflow:

### Automatic Dependency Resolution

The `electron` target uses the `serve` configuration by default, which automatically:

1. **Builds dependencies first**: Ensures your guest project is built before starting development servers
2. **Starts parallel development servers**:
   - `nx run <guest-project>:serve` - Your frontend application's dev server
   - `nx run <host-project>:serve` - The Electron main process dev server
3. **Coordinates hot-reloading**: Both processes watch for changes and reload independently

### The Parallel Execution Model

The development workflow leverages Nx's parallel execution capabilities:

```javascript
// Behind the scenes configuration
commands: [
  `nx run ${guestProject}:serve`,    // Frontend dev server
  `nx run ${hostProject}:serve`,     // Electron main process
],
parallel: true  // Both run simultaneously
```

This means:

- **Frontend changes** trigger immediate hot-module replacement in the renderer process
- **Main process changes** restart the Electron shell automatically
- **Both processes** can be developed independently without blocking each other

## Development Server Targets

The plugin configures multiple targets for different development scenarios:

### `electron` Target (Primary)

- **Purpose**: Main development command
- **Executor**: `nx:run-commands`
- **Behavior**: Runs both guest and host servers in parallel
- **Best for**: Regular development workflow

### `serve` Target (Host Only)

- **Purpose**: Runs only the Electron host dev server
- **Executor**: `@nx/vite:dev-server`
- **Behavior**: Focuses on main process development
- **Best for**: Debugging main process logic in isolation

### Guest Project Serve

- **Purpose**: Runs only the frontend application
- **Command**: `nx serve <guest-project-name>`
- **Best for**: Frontend-only development and testing

## Hot-Reloading Capabilities

The development workflow provides comprehensive hot-reloading:

### Renderer Process (Frontend)

- **Vite HMR**: Near-instantaneous updates for UI changes
- **Framework-native**: Preserves component state (React Fast Refresh, Vue HMR, etc.)
- **Asset updates**: CSS, images, and other assets reload without full page refresh

### Main Process (Electron)

- **Automatic restart**: Main process restarts when TypeScript/JavaScript files change
- **Window preservation**: Maintains window state and position during restarts
- **Native module support**: Handles changes to native dependencies correctly

## Debugging During Development

### IDE Integration

The development setup is pre-configured for debugging in popular IDEs:

- **VS Code**: Debug both main and renderer processes with breakpoints
- **Chrome DevTools**: Full access to renderer process debugging
- **Electron DevTools**: Native debugging for main process

### Debug Configurations

The generated project includes debug configurations for:

- Main process debugging (Node.js debugging)
- Renderer process debugging (Chrome DevTools)
- Combined debugging sessions

## Development Best Practices

### Recommended Workflow

1. **Start with `nx electron <project>`** for full development
2. **Use individual serves** when focusing on specific processes
3. **Leverage Nx affected** to run only changed dependencies
4. **Monitor both terminals** for errors in either process

### Performance Tips

- **Use Nx caching**: Development builds leverage Nx's computation cache
- **Parallel development**: Take advantage of the parallel execution for faster iteration
- **Selective rebuilds**: Only modified projects rebuild, not the entire workspace

### Troubleshooting Common Issues

Encountering problems during development? See the [Troubleshooting](/troubleshooting#development-issues) page for solutions to port conflicts, build failures, and hot-reload issues.

## Development vs Production Builds

The development workflow is optimized for speed and developer experience:

| Aspect              | Development                 | Production                 |
| ------------------- | --------------------------- | -------------------------- |
| **Build Speed**     | Fast (no optimization)      | Slower (full optimization) |
| **Hot Reload**      | Enabled                     | Disabled                   |
| **Source Maps**     | Full source maps            | Optimized/minimal          |
| **Bundle Size**     | Larger (includes dev tools) | Minimized                  |
| **Error Reporting** | Verbose                     | User-friendly              |

</details>

## Next Steps

Once you're comfortable with the development workflow, explore:

- [Debugging Your Application](/debugging-your-application) for setting up IDE debugging with breakpoints in both main and renderer processes
- [Production Builds](/production-builds) for creating distributable applications
- [Native Module Integration](/generators/build-native) for adding native dependencies
- [Icon Generation](/executors/build-icon) for customizing your application icons
