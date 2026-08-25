import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const required = ['Dockerfile', 'docker-compose.yml', 'public/manifest.webmanifest', 'public/sw.js', 'public/offline.html', 'docs/openapi.json', 'scripts/backup.sh', 'scripts/restore.sh'];
const contents = Object.fromEntries(await Promise.all(required.map(async file => [file, await readFile(file, 'utf8')])));
const manifest = JSON.parse(contents['public/manifest.webmanifest']);
const openapi = JSON.parse(contents['docs/openapi.json']);
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
assert.match(contents['public/sw.js'], /pathname\.startsWith\('\/api\/'\)/);
assert.match(contents.Dockerfile, /HEALTHCHECK/);
assert.match(contents['scripts/restore.sh'], /CONFIRM_RESTORE/);
assert.equal(openapi.openapi, '3.1.0');
console.log(`Production artifacts verified: ${required.length}`);
