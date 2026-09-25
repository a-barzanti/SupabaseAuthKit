#!/usr/bin/env bun
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, relative, isAbsolute } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function staticChecks() {
  const required = [
    'SKILL.md',
    'references/architecture.md',
    'references/permission-matrix.md',
    'references/nextjs-integration.md',
    'references/verification.md',
    'references/agent-evaluations.md',
    'assets/migrations/20260925090000_organizations.sql',
    'assets/migrations/20260925080000_legacy_hardening.sql',
    'assets/tests/authorization.mjs',
    'assets/ui/organization-workspace.tsx',
  ];
  for (const file of required) await stat(resolve(root, file));
  const skill = await readFile(resolve(root, 'SKILL.md'), 'utf8');
  if (!/^---\nname: supabase-authkit\ndescription: .+\n/m.test(skill))
    throw new Error('Invalid skill identity/frontmatter');
  async function walk(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, item.name);
      if (item.isSymbolicLink()) throw new Error(`Skill must be self-contained: ${path}`);
      if (item.isDirectory()) await walk(path);
      else if (item.name.endsWith('.md')) {
        const text = await readFile(path, 'utf8');
        for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
          if (/^https?:\/\//.test(link) || link.startsWith('#')) continue;
          const target = resolve(dirname(path), link.split('#')[0]);
          if (isAbsolute(link) || relative(root, target).startsWith('..'))
            throw new Error(`Non-portable link ${link}`);
          await stat(target);
        }
      }
    }
  }
  await walk(root);
  console.log('Portable skill structure and relative links passed.');
}
try {
  await staticChecks();
  if (!process.argv.includes('--static')) {
    const { verifyAuthorization } = await import('../assets/tests/authorization.mjs');
    await verifyAuthorization();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
