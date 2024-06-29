import { getPackageManagerCommand, logger, workspaceRoot } from "@nx/devkit";
import { ChildProcess, exec } from "child_process";
import { existsSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";

import path = require("node:path/posix");
import { resolve } from "path";
import { exit, platform } from "process";

export const osPlatform:typeof process.platform = process.platform;

/**
 * a quick function to compare versions of node and tell if version 1 is greater than version 2
 * @param version1 version 1 to comnpar
 * @param version2
 * @returns
 */
export function compareNodeVersion(version1, version2) {
  const v1 = version1.replace('v','').split('.').map(Number);
  const v2 = version2.replace('v','').split('.').map(Number);
  for(let i = 0; i < Math.max(v1.length,v2.length); i++) {
    const v1part = v1[i] || 0;
    const v2part = v2[i] || 0;
    if(v1part > v2part) {
      return 1; //version1 is greater
    } else if (v1part < v2part){
      return -1; //version2 is greater
    }
  }
  return 0; //versions are equal
}

/**
 * A function to run a command until a criteria is met
 * @param command the command to run
 * @param criteria the criteria to meet as a text output. If the criteria is met, the promise resolves
 * @returns a promise that resolves when the criteria is met
 */
export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean,
): Promise<ChildProcess> {
  const pathToWorkspace = resolve(workspaceRoot);
  const p = exec(`${command}`,{
    encoding: 'utf-8',
    cwd: pathToWorkspace,
  });
  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(data: string) {
      output += data;
      if (criteria(output)) {
        complete = true;
        res(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);
    p.stdout?.on('data', (data) => process.stdout.write(data));
    p.stderr?.on('data', (data) => process.stderr.write(data));
    p.on('exit', (code) => {
      if (!complete) {
        rej(`Exited with ${code}`);
      } else {
        res(p);
      }
    });
    p.stderr.on('error', (error) => {
      console.error(error);
      rej(error);
    });
  });
}

/**
 * a function to restore the package.json file to its original state
 * @param workspace the path to the workspace
 * @param originalPackageJson the original package.json object
 */
export async function restorePackageJson(workspace: string, originalPackageJson: object) {
  await writeFile(
    path.join(workspace, 'package.json'),
    JSON.stringify(originalPackageJson, null, 2)
  );
}

/**
 * A function to delete a directory
 * @param directoryPath the path to the directory to delete
 * @returns a promise that resolves when the directory is deleted
 */
export async function deleteDirectory(directoryPath: string): Promise<void> {
  try {
    await rm(directoryPath, { recursive: true, force: true });
    logger.warn(`🗑️  Directory ${directoryPath} deleted successfully.`);
  } catch (error) {
    logger.error(`⚠️ Error deleting directory ${directoryPath}:`);
    console.error(error);
    exit(1);
  }
}


export type resolveIconCommandParams = {
  hostProjectRoot: string;
  hostProject: string;
  osPlatform: typeof platform;
  type:'icon'| 'setup';
  iconOutputPath: string;
}

export async function resolveIconCommand(params:resolveIconCommandParams) {

  if(!existsSync(params.iconOutputPath)) {
    await mkdir(params.iconOutputPath, {recursive: true});
  }

  const resolveSourceFile = path.join(params.hostProjectRoot, 'electron',
  'resources',
  'icon',
  'source',
  `${params.type}.png`);
  const resolveTargetFile = path.join(params.iconOutputPath, params.type);


  const _args = ` ${params.osPlatform === 'darwin' ? '-icns' : '-icop'} -hm -i`
  // return getPackageManagerCommand().run('png2icons', `${sourceFile} ${targetPath} ${_args}`);
  return `${getPackageManagerCommand().exec} png2icons ${resolveSourceFile} ${resolveTargetFile} ${_args}`;
}
