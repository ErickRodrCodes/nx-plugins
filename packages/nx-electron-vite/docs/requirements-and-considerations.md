# nx-electron-vite

<center>

|                      |                           |                                                                         |                     |                               |                             |                                                |
| :------------------: | :-----------------------: | :---------------------------------------------------------------------: | :-----------------: | :---------------------------: | :-------------------------: | :--------------------------------------------: |
| [Home](../README.md) | [Features](./features.md) | [Requirements and Considerations](./requirements-and-considerations.md) | [Setup](./setup.md) | [Generators](./generators.md) | [Executors](./executors.md) | [Compatibility with Nx](./compatibility-nx.md) |

</center>

## Requirements and considerations

- ⚠️ It requires you to use a monorepo approach for it to work. At the moment of writting, it works under this approach.
- ⚠️ It requires you to use Vite as bundler for your React or Vue Applications, or to use a Vite webapp. Angular support will come soon.

### Important Considerations

**This plugin is intended for new projects**. It affects also how your workspace works as it will add the `"type":"module"` keyword on your workspace `package.json`, so if you have a large codebase it is strongly recommended split your application in a separate codebase and setup the plugin to run electron on it.

🚨 IMPORTANT: That said, workflows based on jest, cypress, playwright, or postcss might break. for this, you might want to change specific files having the extension `cjs` instead of `js`. The generator will parse some of this files for you, but if something breaks it will be needed to change extensions for certain js files and verify it works back as intended.

<center>

|                      |                           |                                                                         |                     |                               |                             |                                                |
| :------------------: | :-----------------------: | :---------------------------------------------------------------------: | :-----------------: | :---------------------------: | :-------------------------: | :--------------------------------------------: |
| [Home](../README.md) | [Features](./features.md) | [Requirements and Considerations](./requirements-and-considerations.md) | [Setup](./setup.md) | [Generators](./generators.md) | [Executors](./executors.md) | [Compatibility with Nx](./compatibility-nx.md) |

Copyright (c) 2024-present Erick Rodriguez. Licensed under the MIT License (MIT)

</center>
