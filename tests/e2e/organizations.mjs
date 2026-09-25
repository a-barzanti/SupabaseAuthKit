import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const env = process.env;
const baseURL = env.AUTHKIT_APP_URL ?? 'http://127.0.0.1:3000';
if (
  env.AUTHKIT_TEST_DISPOSABLE !== '1' ||
  !env.AUTHKIT_DB_CONTAINER ||
  !['127.0.0.1', 'localhost'].includes(new URL(env.AUTHKIT_SUPABASE_URL).hostname) ||
  !['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)
)
  throw new Error('Browser smoke requires loopback disposable stack and AUTHKIT_DB_CONTAINER.');
const admin = createClient(env.AUTHKIT_SUPABASE_URL, env.AUTHKIT_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const fixture = randomUUID();
const password = 'Authkit-browser-Password-94!';
const users = [];
const browser = await chromium.launch({
  headless: true,
  ...(env.AUTHKIT_CHROMIUM_PATH ? { executablePath: env.AUTHKIT_CHROMIUM_PATH } : {}),
});
async function visible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 20000 });
}
async function login(page, email) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Your organizations', exact: true }));
}
async function saved(page) {
  await visible(page.getByRole('status').filter({ hasText: 'Saved.' }));
  await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
}
try {
  for (const name of ['owner', 'member']) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${name}-${fixture}@example.test`,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    users.push(data.user);
  }
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${baseURL}/protected`);
  await visible(page.getByRole('button', { name: 'Login', exact: true }));
  await login(page, users[0].email);
  await page.getByLabel('New organization').fill(`Browser A ${fixture}`);
  await page.getByRole('button', { name: 'Create organization', exact: true }).click();
  await saved(page);
  await visible(page.getByRole('heading', { name: 'Members · your role: owner', exact: true }));
  const orgA = new URL(page.url()).searchParams.get('organization');
  assert.ok(orgA);
  await page.getByLabel('Existing user ID').fill(users[1].id);
  await page.getByLabel('Membership role').selectOption('admin');
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  await saved(page);
  await visible(page.getByText(users[1].id, { exact: true }));
  await page.getByLabel('Project name').fill('Private A project');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await saved(page);
  await visible(page.getByText('Private A project', { exact: true }));
  await page.getByLabel('New organization').fill(`Browser B ${fixture}`);
  await page.getByRole('button', { name: 'Create organization', exact: true }).click();
  await saved(page);
  await page.waitForURL((url) => url.searchParams.get('organization') !== orgA);
  const orgB = new URL(page.url()).searchParams.get('organization');
  await page.getByLabel('Existing user ID').fill(users[1].id);
  await page.getByLabel('Membership role').selectOption('member');
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  await saved(page);

  const second = await (await browser.newContext()).newPage();
  await login(second, users[1].email);
  await visible(second.getByRole('heading', { name: 'Members · your role: admin', exact: true }));
  await visible(second.getByText('Private A project', { exact: true }));
  await second.getByLabel('Active organization').selectOption(orgB);
  await visible(second.getByRole('heading', { name: 'Members · your role: member', exact: true }));
  assert.equal(
    await second.getByRole('button', { name: 'Create project', exact: true }).count(),
    0,
  );
  assert.equal(await second.getByText('Private A project', { exact: true }).count(), 0);
  await page.getByLabel('Active organization').selectOption(orgA);
  await visible(page.getByText('Private A project', { exact: true }));
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
  await saved(page);
  await visible(page.getByRole('heading', { name: 'Members · your role: admin', exact: true }));
  await second.getByLabel('Active organization').selectOption(orgA);
  await visible(second.getByRole('heading', { name: 'Members · your role: owner', exact: true }));
  second.on('dialog', (dialog) => dialog.accept());
  await second.getByRole('button', { name: 'Remove', exact: true }).click();
  await saved(second);
  await page.goto(`${baseURL}/protected?organization=${orgA}`);
  await visible(page.getByRole('heading', { name: 'Members · your role: owner', exact: true }));
  assert.equal(await page.getByText('Private A project', { exact: true }).count(), 0);
  assert.equal(await page.getByLabel('Active organization').inputValue(), orgB);
  await page.getByRole('button', { name: /log\s*out/i }).click();
  // Let the server action clear the session before testing a new protected request.
  await page.waitForURL('**/auth/login');
  await page.goto(`${baseURL}/protected`);
  await visible(page.getByRole('button', { name: 'Login', exact: true }));
  console.log(
    'Browser smoke passed: login, create, member roles, switching, tenant visibility, transfer, removal, stale selection and logout.',
  );
} catch (error) {
  for (const [index, context] of browser.contexts().entries()) {
    const page = context.pages()[0];
    if (page)
      await page.screenshot({ path: `/tmp/authkit-browser-failure-${index}.png`, fullPage: true });
  }
  throw error;
} finally {
  await browser.close();
  const { data: organizations, error } = await admin
    .from('organizations')
    .select('id')
    .like('name', `%${fixture}`);
  if (error) throw error;
  if (organizations.length) {
    const ids = organizations.map((row) => `'${row.id}'`).join(',');
    execFileSync(
      'docker',
      [
        'exec',
        '-i',
        env.AUTHKIT_DB_CONTAINER,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      {
        input: `begin; set local session_replication_role = replica;
        delete from organization_tasks where organization_id in (${ids});
        delete from organization_projects where organization_id in (${ids});
        delete from organization_memberships where organization_id in (${ids});
        delete from organizations where id in (${ids}); commit;`,
        stdio: ['pipe', 'ignore', 'pipe'],
      },
    );
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
}
