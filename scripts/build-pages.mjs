import fs from 'node:fs';
import path from 'node:path';

const app = process.argv[2] || 'client';
const allowed = new Set(['client', 'admin', 'owner']);
if (!allowed.has(app)) throw new Error(`Unknown app: ${app}`);

const root = process.cwd();
const source = path.join(root, 'shared');
const target = path.join(root, 'apps', app, 'shared');

if (!fs.existsSync(source)) throw new Error('Missing shared/ directory');
if (!fs.existsSync(path.join(root, 'apps', app, 'index.html'))) {
  throw new Error(`Missing apps/${app}/index.html`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

for (const file of ['_headers', 'index.html']) {
  if (!fs.existsSync(path.join(root, 'apps', app, file))) {
    throw new Error(`Missing apps/${app}/${file}`);
  }
}

console.log(`Pages build ready: apps/${app}`);
console.log(`Shared assets staged: apps/${app}/shared`);
