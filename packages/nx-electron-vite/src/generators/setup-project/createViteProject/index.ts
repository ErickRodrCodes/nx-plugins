/**
 * This file is chosen when the generator:
 * - cannot detect a vite.config.ts on the guest project that will be used in the renderer process
 * - or if the guest project has a vite configuration and the user decides to use a separate project for the main process
 */

export function generateMainProcessProject(projectName:string) {
   return ''
}
