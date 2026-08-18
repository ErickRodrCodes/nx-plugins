import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findPackagedNativeBinary,
  injectSqliteSmokeIpc,
  resolveHostDistNativePath,
  resolveHostNativeBinaryName,
} from '../shared/inject-sqlite-ipc';
import { writeLatestWorkspacePointer } from '../shared/latest-workspace';
import {
  ELECTRON_HOST,
  EXECUTABLE_NAME,
  GUEST_APP,
  smokeTestsTmpDir,
  workspaceGenerator,
} from '../shared/setup';

const withNative = process.env.SMOKE_NATIVE === '1';

/**
 * Layer 1 — Plugin contract / packaging smoke (Vitest)
 *
 * Proves generators + icons + dist produce an installer named from executableName.
 * Does not launch Electron (Layer 2 / Playwright).
 *
 * Native modules (better-sqlite3) are opt-in via SMOKE_NATIVE=1 and run before dist
 * so the packaged app includes the .node + sqlite IPC smoke wiring.
 */
describe.sequential('Layer 1: packaging smoke', () => {
  describe('setup', () => {
    it('built plugin tarball and scaffolded host/guest', () => {
      expect(
        existsSync(join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz')),
      ).toBe(true);

      const ws = workspaceGenerator!;
      expect(existsSync(ws.getWorkspacePath())).toBe(true);
      expect(
        ws.readJsonFile('package.json').devDependencies?.[
          '@erickrodrcodes/nx-electron-vite'
        ],
      ).toBe('file:./nx-electron-vite.tar.gz');

      expect(ws.fileExists(`apps/${GUEST_APP}/project.json`)).toBe(true);
      expect(ws.fileExists(`apps/${ELECTRON_HOST}/project.json`)).toBe(true);
      expect(ws.fileExists(`apps/${ELECTRON_HOST}/src/main/main.ts`)).toBe(
        true,
      );
      expect(
        ws.fileExists(`apps/${ELECTRON_HOST}/electron-nx-vite.config.ts`),
      ).toBe(true);
      expect(
        ws.fileExists(`apps/${ELECTRON_HOST}/src/electron-builder.yml`),
      ).toBe(true);
    });

    it('wires dist target to build-electron with icons dependency', () => {
      const projectJson = workspaceGenerator!.readJsonFile(
        `apps/${ELECTRON_HOST}/project.json`,
      ) as {
        name: string;
        targets: Record<
          string,
          {
            executor?: string;
            dependsOn?: Array<{ target?: string }>;
            options?: { mainOutputFilename?: string };
          }
        >;
      };

      expect(projectJson.name).toBe(ELECTRON_HOST);
      expect(projectJson.targets.dist?.executor).toBe(
        '@erickrodrcodes/nx-electron-vite:build-electron',
      );
      expect(
        projectJson.targets.dist?.dependsOn?.some(
          (d) => d.target === 'nx-electron-icons',
        ),
      ).toBe(true);
      expect(projectJson.targets['nx-electron-icons']?.executor).toBe(
        '@erickrodrcodes/nx-electron-vite:build-icon',
      );
      expect(projectJson.targets.dist?.options?.mainOutputFilename).toBe(
        'main.cjs',
      );

      const builderYml = workspaceGenerator!.readTextFile(
        `apps/${ELECTRON_HOST}/src/electron-builder.yml`,
      );
      expect(builderYml).toContain('appId:');
      expect(builderYml).toContain('productName:');
      expect(builderYml).toMatch(new RegExp(EXECUTABLE_NAME));
      expect(builderYml).toContain('**/*.node');
    });
  });

  describe('icons', () => {
    it('generates platform icons via nx-electron-icons', () => {
      const ws = workspaceGenerator!;
      expect(
        ws.fileExists(
          `apps/${ELECTRON_HOST}/src/resources/icon/source/icon.png`,
        ),
      ).toBe(true);

      ws.execCommand(`${ws.nxCli()} run ${ELECTRON_HOST}:nx-electron-icons`, {
        stdio: 'inherit',
      });

      const iconDir = `dist/apps/${ELECTRON_HOST}-icons`;
      if (process.platform === 'darwin') {
        expect(ws.fileExists(`${iconDir}/icon.icns`)).toBe(true);
        expect(ws.fileExists(`${iconDir}/setup.icns`)).toBe(true);
      } else if (process.platform === 'win32') {
        expect(ws.fileExists(`${iconDir}/icon.ico`)).toBe(true);
        expect(ws.fileExists(`${iconDir}/setup.ico`)).toBe(true);
      } else {
        expect(ws.fileExists(`${iconDir}/icon.png`)).toBe(true);
        expect(ws.fileExists(`${iconDir}/setup.png`)).toBe(true);
      }
    });
  });

  describe.skipIf(!withNative)(
    'native (opt-in: SMOKE_NATIVE=1) — Nx first, then edit main, then dist',
    () => {
      it('uses nx build-native to produce better-sqlite3.node in host native/', () => {
        const ws = workspaceGenerator!;
        const installCmd =
          ws.getPackageManager() === 'npm'
            ? 'npm install -D better-sqlite3'
            : `${ws.getPackageManager()} add -D better-sqlite3`;

        ws.execCommand(installCmd, { stdio: 'inherit' });
        // Plugin generator: rebuild for Electron ABI + place .node + reference.json
        ws.execCommand(
          `${ws.nxCli()} g @erickrodrcodes/nx-electron-vite:build-native --hostProject="${ELECTRON_HOST}" --npmPackageName="better-sqlite3" --no-interactive`,
          { stdio: 'inherit' },
        );

        expect(
          ws.fileExists(
            `apps/${ELECTRON_HOST}/src/main/native/better-sqlite3.node`,
          ),
        ).toBe(true);

        // Guard against copying a foreign prebuild (e.g. Mach-O on Windows).
        if (process.platform === 'win32') {
          const nodeAbs = join(
            ws.getWorkspacePath(),
            `apps/${ELECTRON_HOST}/src/main/native/better-sqlite3.node`,
          );
          const magic = readFileSync(nodeAbs).subarray(0, 2).toString('ascii');
          expect(
            magic,
            'copied .node must be a PE (MZ) Win32 binary, not a foreign prebuild',
          ).toBe('MZ');
        }

        const reference = ws.readJsonFile(
          `apps/${ELECTRON_HOST}/src/main/native/reference.json`,
        ) as Record<string, { path?: string; version?: string }>;
        expect(reference['better-sqlite3']?.path).toBe('better-sqlite3.node');
        expect(reference['better-sqlite3']?.version).toBeDefined();
      });

      it('edits host main to load .node and expose mock rows over IPC', () => {
        const ws = workspaceGenerator!;
        // Only after build-native artifacts exist — smoke harness patches main
        injectSqliteSmokeIpc({
          workspacePath: ws.getWorkspacePath(),
          electronHost: ELECTRON_HOST,
        });
        expect(
          ws.fileExists(`apps/${ELECTRON_HOST}/src/main/sqlite-smoke.ts`),
        ).toBe(true);
        const main = ws.readTextFile(`apps/${ELECTRON_HOST}/src/main/main.ts`);
        expect(main).toContain('registerSqliteSmokeIpc');
        expect(main).toContain('pushSqliteMockRows');
      });
    },
  );

  describe('dist', () => {
    it('packages an installer whose name matches executableName', () => {
      const ws = workspaceGenerator!;

      console.log(
        `Building Electron distribution for ${ELECTRON_HOST} (may take several minutes)...`,
      );
      ws.execCommand(`${ws.nxCli()} run ${ELECTRON_HOST}:dist`, {
        stdio: 'inherit',
      });

      const installer = ws.findInstallerArtifact(EXECUTABLE_NAME);
      expect(
        installer,
        `Expected installer under dist/ matching ${EXECUTABLE_NAME}-0.0.0-setup.*`,
      ).toBeTruthy();
      console.log(`✅ Installer artifact: ${installer}`);

      let hasNative = false;
      let nativeBinaryName: string | undefined;

      if (withNative) {
        nativeBinaryName = resolveHostNativeBinaryName(
          ws.getWorkspacePath(),
          ELECTRON_HOST,
        );
        const hostDistNode = resolveHostDistNativePath(
          ws.getWorkspacePath(),
          ELECTRON_HOST,
          nativeBinaryName,
        );
        expect(
          existsSync(hostDistNode),
          `copyNative should place ${nativeBinaryName} at ${hostDistNode}`,
        ).toBe(true);

        const packaged = findPackagedNativeBinary(
          ws.getWorkspacePath(),
          GUEST_APP,
          ELECTRON_HOST,
          nativeBinaryName,
        );
        expect(
          packaged,
          `Packaged .node not found for ${nativeBinaryName} (asarUnpack **/*.node?)`,
        ).toBeTruthy();
        console.log(`✅ Packaged native binary: ${packaged}`);
        hasNative = true;
      }

      writeLatestWorkspacePointer({
        workspacePath: ws.getWorkspacePath(),
        runDir: smokeTestsTmpDir,
        guestApp: GUEST_APP,
        electronHost: ELECTRON_HOST,
        executableName: EXECUTABLE_NAME,
        hasDist: true,
        hasNative,
        nativeBinaryName,
      });
    });
  });
});
