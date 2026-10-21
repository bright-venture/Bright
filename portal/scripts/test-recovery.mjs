import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real Server Action with mocked Auth transport. No real emails,
// passwords, users, or sessions are created or changed by these tests.
const source = await readFile(new URL('../src/app/auth/update-password/actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function actionFor({ allowed = true, aal = 'aal1', factors = [], factorError = null, updateError = null, logoutError = null } = {}) {
  const calls = { authorization: 0, update: 0, logout: 0 };
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported,
    require(name) {
      assert.equal(name, '@/lib/auth/employee');
      return { requireEmployee: async () => {
        calls.authorization++;
        if (!allowed) throw new Error('Access denied');
        return { claims: { aal }, supabase: { auth: {
          mfa: { listFactors: async () => ({ data: { all: factors }, error: factorError }) },
          updateUser: async () => { calls.update++; return { error: updateError }; },
          signOut: async ({ scope }) => { assert.equal(scope, 'global'); calls.logout++; return { error: logoutError }; },
        } } };
      } };
    },
  });
  return { run: exported.updatePassword, calls };
}

function form(password = 'test-only-not-a-real-password', confirmation = password) {
  const data = new FormData(); data.set('password', password); data.set('confirmation', confirmation); return data;
}
const initial = { saved: false, error: '' };

test('direct action calls cannot bypass employee authorization', async () => {
  const { run, calls } = actionFor({ allowed: false });
  await assert.rejects(run(initial, form()), /Access denied/);
  assert.equal(calls.authorization, 1); assert.equal(calls.update, 0);
});
test('server rejects short or mismatched passwords without writing', async () => {
  const { run, calls } = actionFor();
  assert.equal((await run(initial, form('short'))).saved, false);
  assert.equal((await run(initial, form(undefined, 'different'))).saved, false);
  assert.equal(calls.update, 0);
});
test('email recovery does not bypass an existing verified MFA factor', async () => {
  const { run, calls } = actionFor({ factors: [{ status: 'verified' }] });
  const result = await run(initial, form());
  assert.equal(result.saved, false); assert.match(result.error, /authenticator/); assert.equal(calls.update, 0);
});
test('factor lookup failure prevents password updates', async () => {
  const { run, calls } = actionFor({ factorError: { message: 'unavailable' } });
  assert.equal((await run(initial, form())).saved, false); assert.equal(calls.update, 0);
});
test('approved account without an enrolled authenticator can finish first recovery', async () => {
  const { run, calls } = actionFor();
  assert.equal((await run(initial, form())).saved, true); assert.equal(calls.update, 1); assert.equal(calls.logout, 1);
});
test('verified MFA account can update its password and request global sign-out', async () => {
  const { run, calls } = actionFor({ aal: 'aal2', factors: [{ status: 'verified' }] });
  assert.equal((await run(initial, form())).saved, true); assert.equal(calls.logout, 1);
});
test('failed update is not reported as a saved password', async () => {
  const { run, calls } = actionFor({ updateError: { code: 'weak_password' } });
  assert.equal((await run(initial, form())).saved, false); assert.equal(calls.logout, 0);
});
test('sign-out failure preserves the successful password-change outcome', async () => {
  const { run } = actionFor({ logoutError: { message: 'unavailable' } });
  const result = await run(initial, form());
  assert.equal(result.saved, true); assert.match(result.error, /could not finish signing out/);
});
