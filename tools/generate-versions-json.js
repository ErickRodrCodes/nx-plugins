const fs = require('fs');
const path = require('path');

const tsFile = path.join(__dirname, '../packages/nx-electron-vite/src/util/versions.ts');
const jsonFile = path.join(__dirname, '../packages/nx-electron-vite/src/util/versions.json');

const content = fs.readFileSync(tsFile, 'utf8');
const match = content.match(/export const versionLibraries = ([\s\S]*?);/);
if (!match) {
  throw new Error('Could not find versionLibraries in versions.ts');
}

// eslint-disable-next-line no-eval
const versionLibraries = eval('(' + match[1] + ')');
fs.writeFileSync(jsonFile, JSON.stringify(versionLibraries, null, 2));
console.log('✅ Generated versions.json');
