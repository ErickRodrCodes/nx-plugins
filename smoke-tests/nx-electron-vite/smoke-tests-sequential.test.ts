import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeLatestWorkspacePointer } from '../shared/latest-workspace';
import {
  ELECTRON_HOST,
  EXECUTABLE_NAME,
  GUEST_APP,
  smokeTestsTmpDir,
  workspaceGenerator,
} from '../shared/setup';

/**
 * Layer 1 — Plugin contract / packaging smoke (Vitest)
 *
 * Proves generators + icons + dist produce an installer named from executableName.
 * Does not launch Electron (Layer 2 / Playwright).
 *
 * Native modules (better-sqlite3) are opt-in via SMOKE_NATIVE=1.
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

      writeLatestWorkspacePointer({
        workspacePath: ws.getWorkspacePath(),
        runDir: smokeTestsTmpDir,
        guestApp: GUEST_APP,
        electronHost: ELECTRON_HOST,
        executableName: EXECUTABLE_NAME,
        hasDist: true,
      });
    });
  });

  describe.skipIf(process.env.SMOKE_NATIVE !== '1')(
    'native (opt-in: SMOKE_NATIVE=1)',
    () => {
      it('rebuilds better-sqlite3 into host native/', () => {
        const ws = workspaceGenerator!;
        const installCmd =
          ws.getPackageManager() === 'npm'
            ? 'npm install better-sqlite3'
            : `${ws.getPackageManager()} add better-sqlite3`;

        ws.execCommand(installCmd, { stdio: 'inherit' });
        ws.execCommand(
          `${ws.nxCli()} g @erickrodrcodes/nx-electron-vite:build-native --hostProject="${ELECTRON_HOST}" --npmPackageName="better-sqlite3" --no-interactive`,
          { stdio: 'inherit' },
        );

        expect(
          ws.fileExists(
            `apps/${ELECTRON_HOST}/src/main/native/better-sqlite3.node`,
          ),
        ).toBe(true);

        const reference = ws.readJsonFile(
          `apps/${ELECTRON_HOST}/src/main/native/reference.json`,
        ) as Record<string, { path?: string; version?: string }>;
        expect(reference['better-sqlite3']?.path).toBe('better-sqlite3.node');
        expect(reference['better-sqlite3']?.version).toBeDefined();
      });
    },
  );
});
