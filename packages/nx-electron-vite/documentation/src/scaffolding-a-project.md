# Scaffolding Your Project

After installing the plugin, the next step is to create your Electron application using the `setup-project` generator. This generator creates a new "host" application that wraps your existing frontend application in an Electron shell.

## Prerequisites

Before running the generator, ensure you have:

- An Nx workspace with a monorepo structure
- An existing frontend application (React, Angular, Vue, Svelte, SolidJS, etc.) that you want to convert to a desktop app

## Running the Generator

You can run the generator in two ways:

### Command Line

::: code-group

```bash [nx]
nx g @erickrodrcodes/nx-electron-vite:setup-project
```

:::

### Using Nx Console (VS Code)

If you're using VS Code with the Nx Console extension, you can use the visual interface:

| ![VsCode Generate UI for the executor `@erickrodrcodes/nx-electron-vite:setup-project`](/images/vscode-generateui-setup-project.png) |
| :----------------------------------------------------------------------------------------------------------------------------------: |
|                       _VS Code Generate UI for the `@erickrodrcodes/nx-electron-vite:setup-project` generator_                       |

## Generator Parameters

The generator will prompt you for the following information (fields are displayed in alphabetical order):

| Parameter        | Description                                                          | Required |
| ---------------- | -------------------------------------------------------------------- | -------- |
| `author`         | Author of the electron application                                   | Yes      |
| `description`    | A brief description of the electron application                      | Yes      |
| `executableName` | Name of the executable file (lowercase and dashes only)              | Yes      |
| `guestProject`   | The name of the existing frontend project to wrap with Electron      | Yes      |
| `name`           | Human-readable name for your Electron app (used in the window title) | Yes      |

For a complete list of all available CLI parameters, see the [setup-project generator reference](/generators/setup-project).

## Validation Process

The generator performs several validation checks:

### Application Type Check

The generator verifies that your selected `guestProject` is actually an application by examining its `project.json` file:

::: code-group

```js [project.json]
{
  ...
  "projectType": "application"
  ...
}
```

:::

**Important Notes:**

- **Libraries are rejected**: The generator will stop execution if `projectType` is `library`
- **Frontend vs Backend detection limitation**: The generator only validates that the project is an `application` but cannot detect if it's frontend or backend. Selecting a backend application (Express, NestJS, etc.) will create a non-functional Electron setup since these cannot run in a browser renderer
- **Choose carefully**: The UI shows all applications in your monorepo—ensure you select a browser-compatible frontend application

## Project Structure After Generation

Once the generator completes successfully, you'll have:

### New Electron Host Project

A new application will be created with the suffix `-electron` based on your guest project's name. For example, if your frontend app is called `my-app`, the new Electron project will be `my-app-electron`.

### Dependency Graph Integration

Your new Electron application will have an implicit dependency on the original frontend application:

| ![Dependency Graph of electron-frontend having implicit dependency to the frontend application](/images/nx-graph.png) |
| :-------------------------------------------------------------------------------------------------------------------: |
|            _Dependency Graph showing the Electron host's implicit dependency on the frontend application_             |

**Understanding Implicit Dependencies**

The `nx-electron-vite` plugin configures your Electron application with an implicit dependency on your frontend application. In the Nx framework, implicit dependencies are manually declared relationships between projects that help Nx understand build and execution order, even when there are no direct code imports between the projects.

**What this means for your workflow:**
This implicit dependency ensures that any changes to your frontend application will trigger the Electron host to recognize those changes and rebuild accordingly when using `nx affected`, maintaining synchronization between your web app and its desktop wrapper.

For more reference about Implicit Dependencies on Nx, [please visit this link](https://nx.dev/reference/project-configuration#implicitdependencies)

## Next Steps

Congratulations! You've successfully scaffolded your Electron application. Your new project is configured with all the necessary files, dependencies, and Nx targets to begin desktop development.

You're now ready to start developing your desktop application. The next logical step is to explore the [Development Workflow](/development-workflow) to learn how to run your app in development mode and make the most of the hot-reloading capabilities.
