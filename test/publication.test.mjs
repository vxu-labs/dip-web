import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('../scripts/check-publication.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'publication-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}
function put(root, file, value) {
  mkdirSync(join(root, file, '..'), { recursive: true });
  writeFileSync(join(root, file), value);
  execFileSync('git', ['add', '--', file], { cwd: root });
}
function check(root) {
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
}
test('publication check accepts source and empty environment templates', t => {
  const root = fixture(t);
  put(root, 'README.md', '# Example\n');
  put(root, '.env.example', 'GITHUB_CLIENT_SECRET=\n');
  assert.equal(check(root).status, 0);
});
test('publication check rejects captured records and operator configuration', t => {
  const root = fixture(t);
  put(root, '.dip/events/example.json', '{}');
  put(root, '.openai/hosting.json', '{}');
  const result = check(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /private or generated file/);
});
test('publication check inspects staged data even if working file was cleaned', t => {
  const root = fixture(t);
  const marker = 'gh' + 'p_' + 'x'.repeat(36);
  put(root, 'config.txt', marker);
  writeFileSync(join(root, 'config.txt'), 'clean working copy');
  const result = check(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GitHub credential/);
  assert(!result.stderr.includes(marker));
});
test('local setup creates a template once and preserves operator configuration', t => {
  const root = fixture(t);
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, '.openai'));
  copyFileSync(new URL('../scripts/setup-local.mjs', import.meta.url), join(root, 'scripts/setup-local.mjs'));
  writeFileSync(join(root, '.openai/hosting.example.json'), '{"d1":"DB"}\n');
  execFileSync(process.execPath, [join(root, 'scripts/setup-local.mjs')]);
  assert.equal(readFileSync(join(root, '.openai/hosting.json'), 'utf8'), '{"d1":"DB"}\n');
  writeFileSync(join(root, '.openai/hosting.json'), '{"custom":true}\n');
  execFileSync(process.execPath, [join(root, 'scripts/setup-local.mjs')]);
  assert.equal(readFileSync(join(root, '.openai/hosting.json'), 'utf8'), '{"custom":true}\n');
});
