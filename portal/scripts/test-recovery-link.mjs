import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function compile(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
const parserExports = {};
vm.runInNewContext(await compile('../src/lib/auth/recovery-link.ts'), { exports: parserExports, URLSearchParams });
const { recoveryTokenFromFragment } = parserExports;
const { recoveryLinkFromUrl } = parserExports;
const errorExports = {};
vm.runInNewContext(await compile('../src/lib/auth/recovery-error.ts'), { exports: errorExports });
const componentCode = await compile('../src/components/confirm-recovery-form.tsx');
const fakeToken = 'test-only-recovery-token-1234567890';
const fragment = `#token_hash=${fakeToken}&type=recovery`;
const sessionFragment = '#access_token=test-only-access.jwt.signature&refresh_token=test-only-refresh-token&type=recovery';

test('only a single well-formed recovery token is accepted', () => {
  assert.equal(recoveryTokenFromFragment(fragment), fakeToken);
  for (const value of ['', '#type=recovery', '#token_hash=short&type=recovery', fragment + '&type=signup', fragment + '&token_hash=other', fragment.replace('type=recovery', 'type=signup'), '#token_hash=%3Cscript%3E&type=recovery']) {
    assert.equal(recoveryTokenFromFragment(value), null);
  }
});

// Run the actual component with a minimal hook harness and mocked Auth transport.
// No email is sent and no real session or account is changed.
function mount(hash = fragment, result = { data: { session: {} }, error: null }, search = '') {
  const slots = []; let cursor = 0; let effects = [];
  const calls = { verify: 0, session: 0, exchange: 0, destination: null, cleaned: false };
  const exported = {};
  const window = {
    location: { hash, search, pathname: '/auth/confirm', replace(path) { calls.destination = path; } },
    history: { replaceState(_state, _unused, path) { assert.equal(path, '/auth/confirm'); window.location.hash = ''; calls.cleaned = true; } },
  };
  vm.runInNewContext(componentCode, {
    exports: exported, window, URLSearchParams,
    require(name) {
      if (name === 'react') return {
        useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
        useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next) => { slots[index] = next; }]; },
        useEffect(effect) { effects.push(effect); },
      };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
      if (name === 'next/link') return { default: 'link' };
      if (name === '@/lib/auth/recovery-link') return parserExports;
      if (name === '@/lib/auth/recovery-error') return errorExports;
      if (name === '@/lib/supabase/client') return { createClient() { assert.equal(window.location.hash, ''); return { auth: { async verifyOtp(options) {
        calls.verify++;
        assert.equal(options.type, 'recovery'); assert.equal(options.token_hash, fakeToken);
        if (result instanceof Error) throw result;
        return result;
      }, async setSession(options) {
        calls.session++;
        assert.equal(options.access_token, 'test-only-access.jwt.signature');
        assert.equal(options.refresh_token, 'test-only-refresh-token');
        return result;
      }, async exchangeCodeForSession(code) {
        calls.exchange++; assert.equal(code, fakeToken); return result;
      } } }; } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  function render() { cursor = 0; effects = []; return exported.ConfirmRecoveryForm(); }
  render();
  for (const effect of effects) { effect(); effect(); } // Strict Mode replay.
  return { calls, render, button: () => render().props.children.find(child => child?.type === 'button') };
}

test('opening the email cleans the fragment without consuming the token', () => {
  const page = mount();
  assert.equal(page.calls.verify, 0); assert.equal(page.calls.cleaned, true);
  assert.equal(page.button().props.disabled, false);
});
test('explicit confirmation succeeds without a requesting-browser verifier', async () => {
  const page = mount();
  const click = page.button().props.onClick;
  await Promise.all([click(), click()]);
  assert.equal(page.calls.verify, 1); assert.equal(page.calls.destination, '/auth/update-password');
});
test('missing tokens cannot initiate verification', async () => {
  const page = mount('');
  assert.equal(page.button().props.disabled, true);
  await page.button().props.onClick(); assert.equal(page.calls.verify, 0);
});
test('expired or throttled links stay on the explanation page', async () => {
  for (const status of [403, 429]) {
    const page = mount(fragment, { data: { session: null }, error: { status } });
    await page.button().props.onClick();
    assert.equal(page.calls.destination, null); assert.equal(page.button().props.disabled, status !== 429);
    assert.ok(page.render().props.children.some(child => child?.props?.role === 'alert'));
  }
});
test('a missing session is not treated as successful recovery', async () => {
  const page = mount(fragment, { data: { session: null }, error: null });
  await page.button().props.onClick(); assert.equal(page.calls.destination, null);
});
test('network failure permits a deliberate retry without redirecting', async () => {
  const page = mount(fragment, new Error('offline'));
  await page.button().props.onClick();
  assert.equal(page.calls.destination, null); assert.equal(page.button().props.disabled, false);
});

test('default email session is handed to the cookie client only after confirmation', async () => {
  const page = mount(sessionFragment);
  assert.equal(page.calls.session, 0); assert.equal(page.calls.cleaned, true);
  await page.button().props.onClick();
  assert.equal(page.calls.session, 1); assert.equal(page.calls.verify, 0);
  assert.equal(page.calls.exchange, 0); assert.equal(page.calls.destination, '/auth/update-password');
});
test('legacy PKCE links still exchange a code', async () => {
  const page = mount('', undefined, `?code=${fakeToken}`);
  await page.button().props.onClick();
  assert.equal(page.calls.exchange, 1); assert.equal(page.calls.destination, '/auth/update-password');
});
test('ambiguous, incomplete, error, or non-recovery sessions are rejected', () => {
  for (const hash of [sessionFragment.replace('type=recovery', 'type=signup'), sessionFragment + '&access_token=duplicate', sessionFragment + '&type=recovery', sessionFragment + '&error=access_denied', '#access_token=missing-refresh&type=recovery', fragment + '&access_token=mixed']) {
    assert.equal(recoveryLinkFromUrl(hash), null);
  }
  assert.equal(recoveryLinkFromUrl(sessionFragment, `?code=${fakeToken}`), null);
  assert.equal(recoveryLinkFromUrl(sessionFragment, '?error_code=otp_expired'), null);
});
test('failed default-email session verification never opens password editor', async () => {
  const page = mount(sessionFragment, { data: { session: null }, error: { status: 403 } });
  await page.button().props.onClick();
  assert.equal(page.calls.destination, null); assert.equal(page.button().props.disabled, true);
});

test('specific browser-verifier failure is shown with a safe diagnostic code', async () => {
  const page = mount('', { data: { session: null }, error: { code: 'pkce_code_verifier_not_found' } }, `?code=${fakeToken}`);
  await page.button().props.onClick();
  const alert = page.render().props.children.find(child => child?.props?.role === 'alert');
  const contents = JSON.stringify(alert);
  assert.match(contents, /code\/pkce_code_verifier_not_found/);
  assert.match(contents, /browser-linked/);
  assert.ok(!contents.includes(fakeToken));
});
test('provider redirect errors explain expired links without another verification request', () => {
  const page = mount('#error=access_denied&error_code=otp_expired&error_description=private-details');
  const alert = page.render().props.children.find(child => child?.props?.role === 'alert');
  const contents = JSON.stringify(alert);
  assert.match(contents, /link\/otp_expired/);
  assert.ok(!contents.includes('private-details'));
  assert.equal(page.calls.verify, 0); assert.equal(page.button().props.disabled, true);
});
test('support details never reflect unknown provider codes or raw messages', () => {
  const details = errorExports.recoveryFailureDetails({ code: fakeToken, message: 'private-error-payload', status: 400 }, 'session');
  assert.equal(details.supportCode, 'session/auth_error (400)');
  assert.ok(!JSON.stringify(details).includes(fakeToken));
  assert.ok(!JSON.stringify(details).includes('private-error-payload'));
});
test('actual SDK recovery request omits PKCE challenge and preserves callback URL', async () => {
  const exported = {}; let requestCount = 0;
  vm.runInNewContext(await compile('../src/lib/supabase/recovery.ts'), {
    exports: exported,
    require(name) {
      if (name === './config') return { supabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'test-only-publishable-key' }) };
      assert.equal(name, '@supabase/supabase-js');
      return { createClient(url, key, options) {
        assert.equal(options.auth.persistSession, false);
        assert.equal(options.auth.detectSessionInUrl, false);
        return createSupabaseClient(url, key, { ...options, global: { fetch: async (url, init) => {
          requestCount++;
          const endpoint = new URL(url);
          assert.equal(endpoint.pathname, '/auth/v1/recover');
          assert.equal(endpoint.searchParams.get('redirect_to'), 'http://127.0.0.1:3000/auth/callback');
          const body = JSON.parse(init.body);
          assert.equal(body.email, 'test@example.invalid');
          assert.ok(!body.code_challenge); assert.ok(!body.code_challenge_method);
          return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        } } });
      } };
    },
  });
  const { error } = await exported.createRecoveryRequestClient().auth.resetPasswordForEmail('test@example.invalid', { redirectTo: 'http://127.0.0.1:3000/auth/callback' });
  assert.equal(error, null); assert.equal(requestCount, 1);
});
