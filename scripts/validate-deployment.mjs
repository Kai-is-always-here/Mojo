import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const validatorFile = path.resolve('scripts/validate-deployment.mjs');
const required = [
  'Dockerfile', 'render.yaml', 'DEPLOYMENT.md', 'server/package.json',
  'server/src/index.js', 'server/src/db.js', 'server/src/services/storage.js',
  'supabase/migrations/20260908_production.sql', 'scripts/build-pages.mjs',
  'apps/client/index.html', 'apps/client/login.html', 'apps/client/register.html',
  'apps/client/support.html', 'apps/client/404.html', 'apps/admin/login.html',
  'apps/owner/login.html', 'shared/i18n/translations.js', 'shared/auth/slideshow.js'
];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing: ${file}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const serverPackage = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8'));
if (!String(packageJson.version).startsWith('1.7.')) errors.push('Root package version is not 1.7.x');
if (!String(serverPackage.version).startsWith('1.7.')) errors.push('Server package version is not 1.7.x');

for (const app of ['client', 'admin', 'owner']) {
  const redirectFile = path.join(root, `apps/${app}/_redirects`);
  if (fs.existsSync(redirectFile)) errors.push(`Remove Cloudflare _redirects loop risk: apps/${app}/_redirects`);
  const config = path.join(root, `apps/${app}/config.js`);
  if (fs.existsSync(config) && !fs.readFileSync(config, 'utf8').includes("'/api'")) {
    errors.push(`Same-origin API base missing: apps/${app}/config.js`);
  }
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.name === '.git' || entry.name === 'node_modules') return [];
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(root)) {
  if (!/\.(js|mjs|html|css|yml|yaml|json|md)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/^<<<<<<<|^=======|^>>>>>>>/m.test(text)) errors.push(`Conflict marker: ${path.relative(root, file)}`);
  if (path.resolve(file) !== validatorFile && text.includes('localhost:8787')) errors.push(`Localhost dependency: ${path.relative(root, file)}`);
}

if (errors.length) {
  console.error('DEPLOYMENT CHECK FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`DEPLOYMENT CHECK PASSED — ${required.length} required files verified`);
