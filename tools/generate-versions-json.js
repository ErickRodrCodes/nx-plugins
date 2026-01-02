const fs = require('fs');
const path = require('path');

const tsFile = path.join(__dirname, '../packages/nx-electron-vite/src/util/versions.ts');
const jsonFile = path.join(__dirname, '../packages/nx-electron-vite/src/util/versions.json');

function parseVersionsObject(content) {
  // Extract the object content between braces
  const match = content.match(/export const versionLibraries = \{([\s\S]*?)\};/);
  if (!match) {
    throw new Error('Could not find versionLibraries object in versions.ts');
  }

  const objectContent = match[1];

  // Parse key-value pairs more safely
  const versionLibraries = {};
  const lines = objectContent.split(',');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match key: 'value' or key: "value" pattern
    const kvMatch = trimmed.match(/^\s*(\w+)\s*:\s*['"`]([^'"`]+)['"`]\s*$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      versionLibraries[key] = value;
    }
  }

  return versionLibraries;
}

try {
  const content = fs.readFileSync(tsFile, 'utf8');
  const versionLibraries = parseVersionsObject(content);

  // Validate that we got some versions
  if (Object.keys(versionLibraries).length === 0) {
    throw new Error('No version libraries were parsed from versions.ts');
  }

  fs.writeFileSync(jsonFile, JSON.stringify(versionLibraries, null, 2));
  console.log('✅ Generated versions.json with', Object.keys(versionLibraries).length, 'entries');
} catch (error) {
  console.error('❌ Failed to generate versions.json:', error.message);
  process.exit(1);
}
