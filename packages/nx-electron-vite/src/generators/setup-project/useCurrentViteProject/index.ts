/**
 * This file is chosen when the generator detects vite.config.ts on the guest project
 * and the user decides to integrate the files for the main process. running the target
 * `serve` would run the plugin for electron main process along with the frontend runtime used
 * by the user.
 */

export function useCurrentViteProject() {
 return ''
}

