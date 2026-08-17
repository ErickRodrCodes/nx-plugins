import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const smokeTestsDir = join(__dirname, '..');
const pointerPath = join(smokeTestsDir, 'tmp', 'latest-workspace.json');

export interface LatestWorkspacePointer {
  workspacePath: string;
  runDir: string;
  guestApp: string;
  electronHost: string;
  executableName: string;
  hasDist: boolean;
  updatedAt: string;
}

export function writeLatestWorkspacePointer(
  pointer: Omit<LatestWorkspacePointer, 'updatedAt'>,
): void {
  mkdirSync(join(smokeTestsDir, 'tmp'), { recursive: true });
  const payload: LatestWorkspacePointer = {
    ...pointer,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(pointerPath, JSON.stringify(payload, null, 2));
  console.log(`📌 Wrote Layer 2 pointer: ${pointerPath}`);
}

export function getLatestWorkspacePointerPath(): string {
  return pointerPath;
}
