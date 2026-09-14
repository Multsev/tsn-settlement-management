import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const requiredFiles = [
  '.env.example',
  '.gitattributes',
  '.github/dependabot.yml',
  '.github/pull_request_template.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'CONTRIBUTING.md',
  'LICENSE',
  'NOTICE',
  'SECURITY.md',
  'docs/github-publication.md'
];

const contents = Object.fromEntries(await Promise.all(requiredFiles.map(async file => [file, await readFile(file, 'utf8')])));
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const gitignore = await readFile('.gitignore', 'utf8');
const dockerignore = await readFile('.dockerignore', 'utf8');

assert.equal(packageJson.private, true, 'Package must not be accidentally published to npm.');
assert.equal(packageJson.author, 'Мульцев Максим Александрович');
assert.equal(packageJson.license, 'Apache-2.0');
assert.match(packageJson.engines?.node || '', /^>=22/, 'Node.js 22+ must be declared.');
assert.match(contents.LICENSE, /^\s*Apache License\s+Version 2\.0, January 2004/);
assert.match(contents.NOTICE, /Copyright 2026 Мульцев Максим Александрович/);
assert.match(gitignore, /^\.env\*$/m, 'All local environment files must be ignored.');
assert.match(gitignore, /^!\.env\.example$/m, 'The safe environment example must remain tracked.');
assert.match(dockerignore, /^\.env\*$/m, 'Environment files must be excluded from Docker build context.');
assert.match(contents['.github/workflows/ci.yml'], /permissions:\s*\n\s*contents: read/);
assert.match(contents['.github/workflows/release.yml'], /permissions:\s*\n\s*contents: write/);

const forbiddenTrackedFiles = execFileSync('git', ['ls-files', '.env', 'node_modules', 'dist', 'storage/uploads'], { encoding: 'utf8' }).trim();
assert.equal(forbiddenTrackedFiles, '', `Forbidden local files are tracked: ${forbiddenTrackedFiles}`);

console.log(`GitHub readiness verified: ${requiredFiles.length} community and automation files.`);
