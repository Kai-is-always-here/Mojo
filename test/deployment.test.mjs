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
    'apps/client/index.html', 'apps/admin/index.html', 'apps/owner/index.html',
    'apps/client/login.html', 'apps/admin/login.html', 'owner/login.html'
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

test('direct admin and owner login aliases are registered', () => {
  const text = fs.readFileSync(path.join(root, 'server/src/index.js'), 'utf8');
  assert.match(text, /const ADMIN_ALIAS = '\/admin'/);
  assert.match(text, /const OWNER_ALIAS = '\/owner'/);
  assert.match(text, /ADMIN_ALIAS}\/login/);
  assert.match(text, /OWNER_ALIAS}\/login/);
});

test('all three login screens expose the requested controls', () => {
  const files = ['apps/client/login.html', 'apps/admin/login.html', 'owner/login.html'];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /auth-topbar/);
    assert.match(text, /auth-logo/);
    assert.match(text, /rememberMe/);
    assert.match(text, /Forgot password\?/);
    assert.match(text, /password-toggle/);
    assert.match(text, /placeholder="\.\.\."/);
    assert.match(text, /Service|Customer Service/);
    assert.match(text, /Language/);
  }
});

test('shared auth slideshow uses cover sizing and brighter poster treatment', () => {
  const text = fs.readFileSync(path.join(root, 'shared/auth/slideshow.css'), 'utf8');
  assert.match(text, /background-size:cover/);
  assert.match(text, /brightness\(\.9\)/);
  assert.match(text, /100dvh/);
});
