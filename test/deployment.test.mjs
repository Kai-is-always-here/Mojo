import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('required production files exist', () => {
  const required = [
    'Dockerfile', 'render.yaml', 'server/package.json', 'server/src/index.js',
    'server/src/db.js', 'server/src/services/storage.js',
    'supabase/migrations/20260908_production.sql',
    'apps/client/index.html', 'apps/admin/index.html', 'apps/owner/index.html'
  ];
  for (const file of required) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});

test('frontend API configuration is same-origin by default', () => {
  for (const app of ['client', 'admin', 'owner']) {
    const text = fs.readFileSync(path.join(root, `apps/${app}/config.js`), 'utf8');
    assert.match(text, /apiBase\s*=\s*configuredApi\s*\|\|\s*['"]\/api['"]/);
    assert.doesNotMatch(text, /localhost|127\.0\.0\.1|railway\.app/);
  }
});

test('server parses JSON for client and order APIs', () => {
  const text = fs.readFileSync(path.join(root, 'server/src/index.js'), 'utf8');
  assert.match(text, /app\.use\('\/api\/client', express\.json/);
  assert.match(text, /app\.use\('\/api\/orders', express\.json/);
});

test('production CORS is opt-in', () => {
  const text = fs.readFileSync(path.join(root, 'server/src/index.js'), 'utf8');
  assert.match(text, /if \(configuredOrigins\.length\)/);
  assert.doesNotMatch(text, /'https:\/\/box-office-mojo\.pages\.dev'/);
});
