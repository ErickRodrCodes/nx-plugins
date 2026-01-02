import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { smokeTestsTmpDir, workspaceGenerator } from '../shared/setup';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/*
 * ==================================================================================
 * SMOKE TEST CONFIGURATION - Manual Testing Mode
 * ==================================================================================
 *
 * ENABLED SECTIONS (will run automatically):
 * ✅ Section 01: Workspace Setup and Plugin Installation
 * ✅ Section 02: Plugin Initialization
 * ✅ Section 03: Electron Project Setup
 *
 * DISABLED SECTIONS (commented out for manual testing):
 * ⏸️  Section 04: Native Module Building (.node binaries)
 * ⏸️  Section 05: Icon Generation (icon binaries)
 * ⏸️  Section 06: App Building/Distribution (electron-builder packaging)
 *
 * MANUAL TESTING AFTER AUTOMATED TESTS:
 * After sections 01-03 complete, the workspace will be at:
 *   smoke-tests/tmp/run-<timestamp>/smoke-test-workspace/
 *
 * To manually test the Electron app:
 * 1. cd smoke-tests/tmp/run-<timestamp>/smoke-test-workspace
 * 2. npx nx electron smoke-test-app-electron  (runs both guest + host in dev mode)
 * 3. Verify the Electron window opens and displays the React app
 * 4. Check HMR works (edit apps/smoke-test-app/src/app/app.tsx and save)
 * 5. Test serve commands individually:
 *    - npx nx serve smoke-test-app              (guest app only)
 *    - npx nx serve smoke-test-app-electron     (host only)
 *
 * Once manual verification passes, uncomment sections 04-06 to test binary building.
 * ==================================================================================
 */

// Sequential execution of all smoke tests in correct order
describe.sequential('Smoke Tests - Sequential Execution', () => {
  describe('01: Workspace Setup and Plugin Installation', () => {
    it('should have created the plugin tar.gz in smoke-tests/tmp', () => {
      const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
      expect(existsSync(tarGzPath)).toBe(true);
    });

    it('should have created the workspace successfully', () => {
      const workspacePath = workspaceGenerator!.getWorkspacePath();
      expect(existsSync(workspacePath)).toBe(true);

      // Check for essential workspace files
      const packageJsonPath = join(workspacePath, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);
    });

    it('should have copied tar.gz to workspace', () => {
      // This was already done in global setup, just verify it exists
      const workspacePath = workspaceGenerator!.getWorkspacePath();
      const workspaceTarGzPath = join(workspacePath, 'nx-electron-vite.tar.gz');
      expect(existsSync(workspaceTarGzPath)).toBe(true);
    });

    it('should have plugin installed as dev dependency', () => {
      // This was already done in global setup, just verify it's in package.json
      const packageJson = workspaceGenerator!.readJsonFile('package.json');
      expect(packageJson.devDependencies).toBeDefined();
      expect(
        packageJson.devDependencies['@erickrodrcodes/nx-electron-vite']
      ).toBe('file:./nx-electron-vite.tar.gz');
    });
  });

  describe('02: Plugin Initialization', () => {
    it('should register the plugin in nx.json', () => {
      // Verifica que el plugin esté registrado en nx.json
      const nxJson = workspaceGenerator!.readJsonFile('nx.json');
      const pluginEntry = (nxJson.plugins || []).find(
        (plugin: any) => plugin.plugin === '@nx/vite/plugin'
      );
      expect(pluginEntry).toBeDefined();
    });

    it('should have correct initial dependencies after init', () => {
      // Import versions from the generated JSON file
      const versionLibraries = require('../../packages/nx-electron-vite/src/util/versions.json');

      // Verify that the required Electron dependencies are installed
      const packageJson = workspaceGenerator!.readJsonFile('package.json');

      // Check that the plugin is still in devDependencies
      expect(
        packageJson.devDependencies['@erickrodrcodes/nx-electron-vite']
      ).toBe('file:./nx-electron-vite.tar.gz');

      // Check that Electron dependencies are installed
      // Note: NPM may normalize versions (e.g., "^39.0.0" becomes "39.0.0")
      // We verify dependencies exist and match the major version from versions.json
      const extractMajorVersion = (version: string) => {
        // Remove leading ^ or ~ prefix before matching
        const cleanVersion = version.replace(/^[\^~]/, '');
        // Use bounded quantifier {1,10} and anchor to start to prevent ReDoS
        const match = cleanVersion.match(/^(\d{1,10})\./);
        return match ? match[1] : null;
      };

      expect(packageJson.devDependencies['electron']).toBeDefined();
      expect(extractMajorVersion(packageJson.devDependencies['electron'])).toBe(
        extractMajorVersion(versionLibraries.electron)
      );

      expect(packageJson.devDependencies['electron-builder']).toBeDefined();
      expect(
        extractMajorVersion(packageJson.devDependencies['electron-builder'])
      ).toBe(extractMajorVersion(versionLibraries.electronBuilder));

      expect(packageJson.devDependencies['vite-plugin-electron']).toBeDefined();
      expect(
        extractMajorVersion(packageJson.devDependencies['vite-plugin-electron'])
      ).toBe(extractMajorVersion(versionLibraries.vitePluginElectron));

      expect(
        packageJson.devDependencies['vite-plugin-electron-renderer']
      ).toBeDefined();
      expect(
        extractMajorVersion(
          packageJson.devDependencies['vite-plugin-electron-renderer']
        )
      ).toBe(extractMajorVersion(versionLibraries.vitePluginElectronRenderer));

      expect(packageJson.devDependencies['@electron/rebuild']).toBeDefined();
      expect(
        extractMajorVersion(packageJson.devDependencies['@electron/rebuild'])
      ).toBe(extractMajorVersion(versionLibraries.electronRebuild));

      expect(packageJson.devDependencies['electron-is-dev']).toBeDefined();
      expect(
        extractMajorVersion(packageJson.devDependencies['electron-is-dev'])
      ).toBe(extractMajorVersion(versionLibraries.electronIsDev));

      expect(packageJson.devDependencies['png2icons']).toBeDefined();
      expect(
        extractMajorVersion(packageJson.devDependencies['png2icons'])
      ).toBe(extractMajorVersion(versionLibraries.png2icons));

      expect(packageJson.devDependencies['wait-on']).toBeDefined();
      expect(extractMajorVersion(packageJson.devDependencies['wait-on'])).toBe(
        extractMajorVersion(versionLibraries.waitOn)
      );
    });
  });

  describe('03: Electron Project Setup', () => {
    // Note: The Electron project is created in the global setup (shared/setup.ts)
    // These tests verify that the project was created correctly

    it('should have correct main files in Electron app', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check main files exist
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/main/main.ts`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/preload/preload.ts`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/index.html`)
      ).toBe(true);
    });

    it('should have correct configuration files', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check configuration files exist
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/electron-nx-vite.config.ts`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/vite.config.ts`)
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/tsconfig.app.json`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/tsconfig.json`)
      ).toBe(true);
    });

    it('should have correct package.json with basic properties', () => {
      const electronAppName = 'smoke-test-app-electron';

      const packageJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/package.json`
      );

      // Verify basic package.json properties that are actually in the template
      expect(packageJson.name).toBe(electronAppName);
      expect(packageJson.author).toBe('Test Author');
      expect(packageJson.description).toBe('Test Electron application');
      // Note: type: "module" is NOT set in the template as it breaks development mode.
      // The package.json is copied to dist during build by the copyPackageJson plugin.
    });

    it('should have correct project configuration', () => {
      const electronAppName = 'smoke-test-app-electron';

      const projectJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/project.json`
      );

      expect(projectJson.targets).toBeDefined();
      expect(projectJson.targets.build).toBeDefined();
      expect(projectJson.targets.serve).toBeDefined();
      expect(projectJson.targets.preview).toBeDefined();
    });

    it('should have correct directory structure', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Verify source structure
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/src/main`)
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/src/preload`)
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/src/resources`)
      ).toBe(true);

      // Verify resources structure
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/resources/icon`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/resources/certificate`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/resources/entitlements`
        )
      ).toBe(true);
    });

    it('should have correct TypeScript configuration', () => {
      const electronAppName = 'smoke-test-app-electron';

      const tsConfig = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/tsconfig.json`
      );

      expect(tsConfig.extends).toBeDefined();
      expect(tsConfig.compilerOptions).toBeDefined();
      expect(tsConfig.include).toBeDefined();
    });

    it('should use automatic naming convention (guest-app-electron)', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Verify the project was created with the correct name
      expect(workspaceGenerator!.fileExists(`apps/${electronAppName}`)).toBe(
        true
      );
      expect(
        workspaceGenerator!.fileExists(`apps/${electronAppName}/project.json`)
      ).toBe(true);

      // Verify the project.json has the correct name
      const projectJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/project.json`
      );
      expect(projectJson.name).toBe(electronAppName);
    });

    it('should have correct electron-nx-vite configuration structure', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check electron-nx-vite config content (using type command for Windows compatibility)
      const config = workspaceGenerator!.execCommand(
        `type apps\\${electronAppName}\\electron-nx-vite.config.ts`,
        { stdio: 'pipe' }
      );

      // Verify it's a valid configuration with the actual content structure
      expect(config).toContain('export default');
      expect(config).toContain('electronNxViteConfig');
      expect(config).toContain('vite-plugin-electron');
      expect(config).toContain('src/main/main.ts');
      expect(config).toContain('src/preload/preload.ts');
    });
  });

  // ==================================================================================
  // COMMENTED OUT FOR MANUAL TESTING - Binary building sections
  // These sections build native binaries and should be tested manually first
  // ==================================================================================

  describe('04: Native Module Building', () => {
    it('should install better-sqlite3 and build native modules', () => {
      const electronAppName = 'smoke-test-app-electron';

      console.log('Installing better-sqlite3...');

      // Install native module
      workspaceGenerator!.execCommand('npm install better-sqlite3');

      // Build native module using the generator
      workspaceGenerator!.execCommand(
        `npx nx g @erickrodrcodes/nx-electron-vite:build-native --hostProject="${electronAppName}" --npmPackageName="better-sqlite3" --no-interactive`
      );

      // Verify better-sqlite3 was installed
      const packageJson = workspaceGenerator!.readJsonFile('package.json');
      const hasBetterSqlite3 =
        packageJson.dependencies?.['better-sqlite3'] ||
        packageJson.devDependencies?.['better-sqlite3'];
      expect(hasBetterSqlite3).toBeDefined();
    });

    it('should have created native directory structure', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check that native directory exists
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/main/native`
        )
      ).toBe(true);

      // Check for reference.json file in native directory
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/main/native/reference.json`
        )
      ).toBe(true);
    });

    it('should have built better-sqlite3 and placed the native file correctly', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Verify the native file was created in the correct location
      const nativeDir = `apps/${electronAppName}/src/main/native`;

      // Check if the file exists with the correct naming (better-sqlite3.node)
      expect(
        workspaceGenerator!.fileExists(`${nativeDir}/better-sqlite3.node`)
      ).toBe(true);
    });

    it('should have reference.json file with module information', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Read reference.json - should now contain the built module info
      const referenceJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/src/main/native/reference.json`
      );

      // Verify the file exists and is a valid JSON object
      expect(referenceJson).toBeDefined();
      expect(typeof referenceJson).toBe('object');

      // Verify better-sqlite3 is tracked in reference.json
      expect(referenceJson['better-sqlite3']).toBeDefined();
      expect(referenceJson['better-sqlite3'].path).toBe('better-sqlite3.node');
      expect(referenceJson['better-sqlite3'].version).toBeDefined();
      expect(referenceJson['better-sqlite3'].version).not.toBe('unknown');
    });
  });

  describe('05: Icon Generation', () => {
    it('should have source icon files in correct location', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check for source icon files that should be created by setup-project
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/resources/icon/source/icon.png`
        )
      ).toBe(true);
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/resources/icon/source/setup.png`
        )
      ).toBe(true);
    });

    it('should generate platform-specific icons using nx-electron-icons target', () => {
      const electronAppName = 'smoke-test-app-electron';

      console.log('Generating icons...');
      console.log(`Running on platform: ${process.platform}`);

      workspaceGenerator!.execCommand(
        `npx nx run ${electronAppName}:nx-electron-icons`
      );

      const iconDir = `dist/apps/${electronAppName}-icons`;

      // Platform-aware icon verification
      if (process.platform === 'darwin') {
        // macOS: Should generate .icns files
        expect(workspaceGenerator!.fileExists(`${iconDir}/icon.icns`)).toBe(
          true
        );
        expect(workspaceGenerator!.fileExists(`${iconDir}/setup.icns`)).toBe(
          true
        );
        console.log('✅ macOS .icns icons generated (icon.icns, setup.icns)');
      } else if (process.platform === 'win32') {
        // Windows: Should generate .ico files
        expect(workspaceGenerator!.fileExists(`${iconDir}/icon.ico`)).toBe(
          true
        );
        expect(workspaceGenerator!.fileExists(`${iconDir}/setup.ico`)).toBe(
          true
        );
        console.log('✅ Windows .ico icons generated (icon.ico, setup.ico)');
      } else {
        // Linux: Should generate .png files
        expect(workspaceGenerator!.fileExists(`${iconDir}/icon.png`)).toBe(
          true
        );
        expect(workspaceGenerator!.fileExists(`${iconDir}/setup.png`)).toBe(
          true
        );
        console.log('✅ Linux .png icons generated (icon.png, setup.png)');
      }
    });

    it('should have correct icon configuration in project.json', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check that project.json has the nx-electron-icons target
      const projectJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/project.json`
      );

      // Verify the nx-electron-icons target exists
      expect(projectJson.targets).toBeDefined();
      expect(projectJson.targets['nx-electron-icons']).toBeDefined();
      expect(projectJson.targets['nx-electron-icons'].executor).toBe(
        '@erickrodrcodes/nx-electron-vite:build-icon'
      );
    });
  });

  describe('06: App Building (Distribution)', () => {
    it('should have correct dist target configuration in project.json', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Check that project.json has the dist target configured correctly
      const projectJson = workspaceGenerator!.readJsonFile(
        `apps/${electronAppName}/project.json`
      );

      // Verify the dist target exists and has correct configuration
      expect(projectJson.targets).toBeDefined();
      expect(projectJson.targets['dist']).toBeDefined();
      expect(projectJson.targets['dist'].executor).toBe(
        '@erickrodrcodes/nx-electron-vite:build-electron'
      );

      // Should depend on icon generation
      expect(projectJson.targets['dist'].dependsOn).toBeDefined();
      const iconDependency = projectJson.targets['dist'].dependsOn.find(
        (dep: any) => dep.target === 'nx-electron-icons'
      );
      expect(iconDependency).toBeDefined();
    });

    it('should build the Electron application successfully', () => {
      const electronAppName = 'smoke-test-app-electron';

      console.log('Building Electron application...');
      console.log(
        '⚠️  This process modifies workspace package.json temporarily'
      );

      console.log(
        '🚀 Starting electron-builder (this may take several minutes)...'
      );

      // Execute the dist command - electron-builder is slow, so we capture output
      const result = workspaceGenerator!.execCommand(
        `npx nx run ${electronAppName}:dist`,
        { stdio: 'pipe' }
      );

      console.log('✅ Electron build process completed');
      console.log('Build output preview:', result.substring(0, 300) + '...');

      // Verify command executed successfully
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Verify that electron-builder created a distribution installer (cross-platform)
      console.log('📁 Verifying installer was created...');

      // Check for installer file with any extension (.exe, .dmg, .AppImage, etc.)
      const installerPattern = 'smoke-test-app-0.0.0-setup';
      let installerFound = false;
      let installerName = '';

      // Try common installer extensions for different platforms
      const commonExtensions = [
        'exe',
        'dmg',
        'pkg',
        'deb',
        'rpm',
        'AppImage',
        'tar.gz',
        'zip',
      ];

      for (const ext of commonExtensions) {
        const installerPath = `dist/${installerPattern}.${ext}`;
        if (workspaceGenerator!.fileExists(installerPath)) {
          installerFound = true;
          installerName = `${installerPattern}.${ext}`;
          break;
        }
      }

      // Also check for installer without extension (some platforms)
      if (
        !installerFound &&
        workspaceGenerator!.fileExists(`dist/${installerPattern}`)
      ) {
        installerFound = true;
        installerName = installerPattern;
      }

      if (installerFound) {
        console.log(`  ✅ Distribution installer created: ${installerName}`);
      } else {
        console.log(
          `  ❌ No installer found with pattern: ${installerPattern}.*`
        );
        console.log(
          '  💡 This indicates electron-builder did not complete successfully'
        );
      }

      // Single, clear expectation
      expect(installerFound).toBe(true);
    });

    it('should have electron-builder configuration file', () => {
      const electronAppName = 'smoke-test-app-electron';

      // Verify electron-builder.yml exists
      expect(
        workspaceGenerator!.fileExists(
          `apps/${electronAppName}/src/electron-builder.yml`
        )
      ).toBe(true);

      // Verify it's a valid YAML configuration (can be read)
      const builderConfig = workspaceGenerator!.execCommand(
        `type apps\\${electronAppName}\\src\\electron-builder.yml`,
        { stdio: 'pipe' }
      );

      expect(builderConfig).toBeDefined();
      expect(builderConfig.length).toBeGreaterThan(0);
      // Basic YAML structure check
      expect(builderConfig).toContain('appId:');
      expect(builderConfig).toContain('productName:');
    });
  });
});
