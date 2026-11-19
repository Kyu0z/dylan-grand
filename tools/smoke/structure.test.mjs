import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const required = [
  'AGENTS.md',
  'pnpm-workspace.yaml',
  'apps/web/package.json',
  'apps/web/src/app/page.tsx',
  'apps/admin/package.json',
  'apps/admin/src/app.tsx',
  'apps/api/package.json',
  'apps/api/src/health/health.controller.ts',
  'apps/api/prisma/schema.prisma',
  'infra/docker/compose.yaml',
  'docs/requirements/KICKOFF.md',
  'docs/requirements/Dylan_Grand_Hotel_Project_Kickoff.docx',
  '.github/workflows/ci.yml',
];

test('all baseline paths are present', () => {
  for (const rel of required) assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
});

test('apps have distinct workspace names and entrypoints', () => {
  const names = ['web', 'admin', 'api'].map((name) => {
    const json = JSON.parse(readFileSync(join(root, 'apps', name, 'package.json'), 'utf8'));
    assert.ok(json.scripts.dev && json.scripts.build);
    return json.name;
  });
  assert.deepEqual(names, ['@dylan/web', '@dylan/admin', '@dylan/api']);
});

test('prisma schema does not silently invent business models', () => {
  const schema = readFileSync(join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
  assert.doesNotMatch(schema, /^model\s+\w+/gm);
  assert.match(schema, /provider\s*=\s*"postgresql"/);
});

test('kickoff maintains core spec sections', () => {
  const content = readFileSync(join(root, 'docs/requirements/KICKOFF.md'), 'utf8');
  for (const code of ['US-01', 'US-08', 'AD-01', 'AD-14', 'BR-04']) {
    assert.ok(content.includes(code), `Missing requirement group ${code}`);
  }
});
