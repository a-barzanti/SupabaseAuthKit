import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const files = ['20260925080000_legacy_hardening.sql', '20260925090000_organizations.sql'];
const check = process.argv.includes('--check');
for (const file of files) {
  const source = new URL(`skills/supabase-authkit/assets/migrations/${file}`, root);
  const target = new URL(`supabase/migrations/${file}`, root);
  const content = await readFile(source, 'utf8');
  if (check) {
    if ((await readFile(target, 'utf8')) !== content)
      throw new Error(`Asset drift: ${fileURLToPath(target)}`);
  } else await writeFile(target, content);
}
console.log(check ? 'AuthKit migration parity passed.' : 'AuthKit migrations synchronized.');
