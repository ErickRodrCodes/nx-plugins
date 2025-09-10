# Digital Signing Applications

Digital signing is a crucial step for distributing Electron applications professionally. It ensures users can trust your application and prevents security warnings during installation.

## Current Status

The `nx-electron-vite` plugin includes boilerplate configuration for digital signing in the generated project files. However, the current documentation for this feature is incomplete and needs improvement.

## What's Included

When you scaffold a project with `nx-electron-vite`, the generated configuration includes:

- **Certificate management** setup in the build configuration
- **Code signing** placeholders for different platforms (Windows, macOS, Linux)
- **Build pipeline** integration with `electron-builder`

## Coming Soon

We are actively documenting this procedure to be easy to use with nx-electron-vite.

## In the Meantime

If you need to implement digital signing immediately:

1. **Review the generated configuration** in your `electron-builder.yml` file
2. **Consult electron-builder documentation** for platform-specific signing requirements
3. **Test your signing setup** in a development environment before production

## Stay Updated

We will update this documentation as soon as we can properly document the digital signing process with accurate, tested instructions. Check back for updates in future releases.

## Next Steps

For now, continue with other aspects of your application development:

- [Production Builds](/production-builds) for creating distributable applications
- [Generating Icons](/generating-icons) for customizing your application appearance
- [Native Module Integration](/generators/build-native) for advanced functionality
