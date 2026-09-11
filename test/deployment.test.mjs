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
    'apps/client/login.html', 'apps/client/register.html', 'apps/admin/login.html', 'apps/owner/login.html'
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

test('all canonical login screens expose the requested controls', () => {
  const files = ['apps/client/login.html', 'apps/admin/login.html', 'apps/owner/login.html'];
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

test('auth header controls stay in the viewport corners and use one color', () => {
  const css = fs.readFileSync(path.join(root, 'shared/auth/final-polish.css'), 'utf8');
  assert.match(css, /\.auth-page \.auth-topbar\{position:fixed!important;top:0!important;left:0!important;right:0!important;width:100vw!important/);
  assert.match(css, /\.auth-page \.auth-topbar \.icon-btn\{pointer-events:auto!important/);
  assert.match(css, /\.auth-page \.auth-topbar \.icon-btn:first-child\{justify-self:start!important;color:#d5d9d8!important/);
  assert.match(css, /\.auth-page \.auth-topbar #languageBtn\{justify-self:end!important;color:#d5d9d8!important/);
  assert.match(css, /\.auth-page \.auth-topbar \.icon-btn\{[^}]*border:0!important;[^}]*background:transparent!important/);
  assert.match(css, /\.auth-page \.auth-topbar \.auth-logo\{[^}]*object-fit:cover!important;[^}]*object-position:center 52%!important/);
});

test('mobile-first shell is canonical and legacy shells are removed', () => {
  const css = fs.readFileSync(path.join(root, 'shared/styles/mobile-first.css'), 'utf8');
  assert.match(css, /100dvh|100svh/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.equal(fs.existsSync(path.join(root, 'mobile')), false);
  assert.equal(fs.existsSync(path.join(root, 'admin')), false);
  assert.equal(fs.existsSync(path.join(root, 'owner')), false);
  for (const app of ['client', 'admin', 'owner']) {
    for (const file of fs.readdirSync(path.join(root, 'apps', app)).filter(name => name.endsWith('.html'))) {
      const text = fs.readFileSync(path.join(root, 'apps', app, file), 'utf8');
      assert.match(text, /viewport-fit=cover/);
      assert.match(text, /responsive\.js/);
    }
  }
});

test('client auth pages use canonical assets and routes', () => {
  for (const file of ['apps/client/login.html', 'apps/client/register.html']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /href="\/service"/);
    assert.match(text, /src="\/assets\/logo\.png"/);
    assert.match(text, /loading="eager"/);
  }
  const login = fs.readFileSync(path.join(root, 'apps/client/login.html'), 'utf8');
  const register = fs.readFileSync(path.join(root, 'apps/client/register.html'), 'utf8');
  assert.match(login, /href="\/register"/);
  assert.match(register, /href="\/login"/);
});

test('public route aliases prevent direct page errors', () => {
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
  for (const alias of ['/login.html', '/register.html', '/service', '/support', '/client/index.html', '/client/start', '/client/history', '/client/profile', '/client/support', '/admin/login', '/admin/login.html', '/admin/index.html', '/admin/clients', '/admin/messages', '/admin/settings', '/owner/login', '/owner/login.html', '/owner/index.html', '/owner/admins', '/owner/clients', '/owner/settings']) {
    assert.match(redirects, new RegExp(`^${alias.replaceAll('.', '\\.')}\\s`, 'm'), alias);
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
