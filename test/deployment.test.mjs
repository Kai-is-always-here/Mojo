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
    'apps/client/login.html', 'apps/admin/login.html', 'apps/owner/login.html', 'owner/login.html'
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

test('all login screens expose the requested controls', () => {
  const files = ['apps/client/login.html', 'apps/admin/login.html', 'apps/owner/login.html', 'owner/login.html'];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /auth-topbar/);
    assert.match(text, /auth-logo/);
    assert.match(text, /rememberMe/);
    assert.match(text, /Forgot password\?/);
    assert.match(text, /password-toggle/);
    assert.match(text, /placeholder="\.{5}"/);
    assert.match(text, /Service|Customer Service/);
    assert.match(text, /Language/);
  }
});

test('auth slideshow has exactly 12 local images and polished mobile presentation', () => {
  const js = fs.readFileSync(path.join(root, 'shared/auth/slideshow.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'shared/auth/mobile-app-view.css'), 'utf8');
  assert.ok(js.includes('length: 12'));
  assert.ok(css.includes('background-size:cover'));
  assert.ok(css.includes('brightness(.96)'));
  assert.ok(css.includes('100dvh'));
  assert.ok(css.includes('transition:opacity .9s ease-in-out'));
  assert.ok(css.includes('backdrop-filter:blur(3px)'));
  assert.ok(css.includes('translateY(15px)'));
  assert.doesNotMatch(js, /youtube|vimeo|player\.vimeo/i);
  assert.equal(fs.existsSync(path.join(root, 'shared', 'auth', '13.png')), false, '13.png must not be part of the auth image set');
  for (let i = 1; i <= 12; i += 1) {
    assert.equal(fs.existsSync(path.join(root, 'shared', 'auth', `${i}.png`)), true, `${i}.png`);
  }
});
