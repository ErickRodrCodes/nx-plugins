# Troubleshooting

This page consolidates common issues and solutions when working with `@erickrodrcodes/nx-electron-vite`.

## Development Issues

### Port Conflicts

**Symptoms**: Error messages about ports being in use, or the app fails to start.

**Solutions**:

- Frontend and Electron servers use different ports automatically
- Check if another process is using the debugging ports
- Change the ports in your `.env` file or configuration

### Build Failures

**Symptoms**: The Electron app fails to build or start.

**Solutions**:

- Ensure the guest project builds successfully before running the Electron target
- Run `nx build <guest-project>` to verify the frontend builds correctly
- Check the terminal output for specific error messages

### Hot-Reload Issues

**Symptoms**: Changes to code don't appear in the running app.

**Solutions**:

- Ensure both dev servers are running (check the terminal output)
- Restart the development server with `nx serve <electron-project>`
- Clear the Vite cache in `node_modules/.vite/`

## Debugging Issues

### Debugger Won't Attach

**Symptoms**: VS Code debugger doesn't connect to the running app.

**Solutions**:

- Ensure the Electron app is running in development mode
- Verify the ports match between your app and VS Code configuration
- Check that the debugging flags are enabled in your Vite configuration
- Review your project's `debugme.md` file for exact configuration

### Breakpoints Not Hitting

**Symptoms**: Debugger attaches but breakpoints are skipped.

**Solutions**:

- Ensure source maps are enabled in development
- Verify the file paths in your debugger configuration
- Check that you're debugging the correct process (main vs renderer)

### Key Debugging Configuration Files

- **`debugme.md`** - Project-specific debugging guide with exact configurations (start here!)
- **`electron-nx-vite.config.ts`** - Main Electron configuration including debug port settings
- **`.env`** - Environment variables for customizing debug ports

## Icon Generation Issues

### Icon Generation Fails

**Symptoms**: The `nx-electron-icons` command fails or produces no output.

**Solutions**:

- Check that source PNG files exist in `src/resources/icon/source/`
- Verify file permissions on source images
- Ensure PNG files are valid and not corrupted
- Use higher resolution source images (1024x1024 recommended)

### Poor Quality at Small Sizes

**Symptoms**: Icons look blurry or unclear at small sizes.

**Solutions**:

- Use higher resolution source images
- Simplify the design for better small-size visibility
- Test generated icons at actual display sizes

### Icons Not Updating in Built App

**Symptoms**: Old icons appear in the built application.

**Solutions**:

- Clear the `dist/` folder and rebuild
- Check that electron-builder is using the correct icon paths
- Verify the build process includes the icon generation step

### Debug Icon Generation

To see detailed output during icon generation:

```bash
nx nx-electron-icons <your-electron-project> --verbose
```

## Production Build Issues

### Build Fails with "Package.json not found"

**Symptoms**: The `build-electron` executor fails with a package.json error.

**Solutions**:

- Ensure your guest project builds successfully first: `nx build <guest-project>`
- Verify the guest project's build output path matches the `files` section in `electron-builder.yml`

### Icons Missing in Final Package

**Symptoms**: The built installer or app has default/missing icons.

**Solutions**:

- Verify icon source files exist: `src/resources/icon/source/icon.png` and `src/resources/icon/source/setup.png`
- Run icons generation manually: `nx nx-electron-icons <your-electron-project>`
- Check that generated icons exist in `dist/apps/<your-electron-project>-icons/`

### Large Bundle Size

**Symptoms**: The built application is larger than expected.

**Solutions**:

- Review the `files` section in `electron-builder.yml`
- Exclude unnecessary files and directories
- Check for duplicate dependencies

### Platform-Specific Build Issues

**Windows**:

- Ensure Node.js and npm/pnpm are properly installed
- For code signing issues, see [Digital Signing Applications](/digital-signing)

**macOS**:

- Check Xcode command line tools are available (`xcode-select --install`)
- For notarization, ensure Apple Developer credentials are configured

**Linux**:

- Verify required system packages are installed
- Check for missing native dependencies

### Build Validation Checklist

Before distributing your application:

1. **Install locally**: Test the generated installer on a clean system
2. **Run on clean system**: Verify all dependencies are included
3. **Check file associations**: Ensure proper file type handling
4. **Test auto-updater**: If enabled, verify the update mechanism works

## Native Module Issues

### Native Module Won't Load

**Symptoms**: Error like "Cannot find module" or "not a valid Win32 application".

**Solutions**:

- Ensure you ran `nx g @erickrodrcodes/nx-electron-vite:build-native` for the module
- Verify the `.node` file exists in `src/main/native/` (source) **and** next to `main.cjs` in your
  main process output directory (runtime). The build copies it flat — there is no `native/`
  subfolder in the output
- Resolve the binary with `join(__dirname, '<name>.node')`. Do not use
  `fileURLToPath(import.meta.url)`: the main process is CommonJS, and that expression becomes
  `undefined` after bundling, which crashes the app on startup
- Use the filename exactly as recorded in `reference.json` — it follows the npm package name, so
  `better-sqlite3.node` with hyphens, not `better_sqlite3.node`

**"not a valid Win32 application" specifically** means the `.node` file is not a Windows binary at
all — typically a prebuild for another platform (for example a macOS `darwin-arm64.node`) was picked
up instead of a real rebuild. Confirm the file starts with the `MZ` signature of a Windows PE binary:

```powershell
# Prints "MZ" for a valid Windows binary
[System.IO.File]::ReadAllBytes("apps/my-app-electron/src/main/native/better-sqlite3.node")[0..1] `
  | ForEach-Object { [char]$_ }
```

If it is not `MZ`, delete the file and re-run `build-native` so the module is compiled for your
platform and Electron ABI.

### ABI Mismatch Errors

**Symptoms**: Error mentioning "NODE_MODULE_VERSION" or "was compiled against a different Node.js version".

**Solutions**:

- Re-run the `build-native` generator to rebuild against the current Electron version
- Ensure you're using the same Electron version in development and production

### Finding the Native Binary Path

Check `src/main/native/reference.json` to see the exact binary filenames:

```json
{
  "better-sqlite3": {
    "path": "better-sqlite3.node",
    "version": "13.0.3"
  }
}
```

Load it relative to the compiled main process, which is where the build places it:

```typescript
nativeBinding: join(__dirname, 'better-sqlite3.node');
```

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/ErickRodrCodes/nx-plugins/issues) for similar problems
2. Review the [Architecture Pattern](/architecture-pattern) documentation to understand how the plugin works
3. Open a new issue with:
   - Your Nx and plugin versions
   - The command you ran
   - The full error message
   - Your operating system and Node.js version
