import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// No external dependencies. User operations always use real access tokens; the
// service key is reserved for fixture setup, snapshots and cleanup inspection.
export async function verifyAuthorization(env = process.env) {
  const url = env.AUTHKIT_SUPABASE_URL;
  const anon = env.AUTHKIT_ANON_KEY;
  const service = env.AUTHKIT_SERVICE_ROLE_KEY;
  if (!url || !anon || !service || (!env.AUTHKIT_DATABASE_URL && !env.AUTHKIT_DB_CONTAINER)) {
    throw new Error(
      'Set AUTHKIT_SUPABASE_URL, AUTHKIT_ANON_KEY, AUTHKIT_SERVICE_ROLE_KEY and AUTHKIT_DATABASE_URL (psql) or AUTHKIT_DB_CONTAINER (docker).',
    );
  }
  if (env.AUTHKIT_TEST_DISPOSABLE !== '1')
    throw new Error(
      'AUTHKIT_TEST_DISPOSABLE=1 is required: tests create and delete fixtures in an isolated database.',
    );
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error(
      'Only loopback Supabase test endpoints are supported. Use a local isolated stack.',
    );
  }
  const users = [],
    orgs = [];
  const runId = randomUUID();
  const password = 'Authkit-test-Password-94!';
  let count = 0;
  function pass(label) {
    count++;
    console.log(`ok ${count} - ${label}`);
  }
  async function request(path, token = anon, method = 'GET', body) {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: token === service ? service : anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
  }
  function good(result) {
    assert.equal(result.ok, true, JSON.stringify(result.data));
    return result.data;
  }
  const rpc = (name, actor, args) =>
    request(`/rest/v1/rpc/${name}`, actor?.token ?? anon, 'POST', args);
  const table = (name, actor, method = 'GET', body, query = '') =>
    request(`/rest/v1/${name}?${query}`, actor?.token ?? anon, method, body);
  async function snapshot() {
    const result = {};
    for (const name of [
      'organizations',
      'organization_memberships',
      'organization_projects',
      'organization_tasks',
    ]) {
      const rows = good(
        await request(
          `/rest/v1/${name}?order=${name === 'organization_memberships' ? 'organization_id,user_id' : 'id'}`,
          service,
        ),
      );
      result[name] = rows;
    }
    if (env.AUTHKIT_LEGACY === '1')
      result.user_roles = good(await request('/rest/v1/user_roles?order=user_id', service));
    return result;
  }
  async function denied(label, work, allowEmpty = false) {
    const before = await snapshot();
    const result = await work();
    assert.ok(
      !result.ok || (allowEmpty && Array.isArray(result.data) && result.data.length === 0),
      `${label}: unexpectedly allowed ${JSON.stringify(result)}`,
    );
    assert.deepEqual(await snapshot(), before, `${label}: denied write changed data`);
    pass(label);
  }
  async function createUser(name) {
    const email = `authkit-${name}-${runId}@example.test`;
    const data = good(
      await request('/auth/v1/admin/users', service, 'POST', {
        email,
        password,
        email_confirm: true,
        user_metadata: { intended_role: 'admin' },
      }),
    );
    const user = { id: data.id, email };
    users.push(user);
    const session = good(
      await request('/auth/v1/token?grant_type=password', anon, 'POST', { email, password }),
    );
    user.token = session.access_token;
    return user;
  }
  async function organization(actor, name) {
    const id = good(await rpc('create_organization', actor, { p_name: name }));
    orgs.push(id);
    return id;
  }
  const args = (org, user, role) => ({
    p_organization_id: org,
    p_user_id: user.id,
    ...(role ? { p_role: role } : {}),
  });
  const member = (org, user) =>
    request(
      `/rest/v1/organization_memberships?organization_id=eq.${org}&user_id=eq.${user.id}`,
      service,
    );

  function sqlProcess(sql, keepOpen = false) {
    const command = env.AUTHKIT_DB_CONTAINER ? 'docker' : 'psql';
    const params = env.AUTHKIT_DB_CONTAINER
      ? [
          'exec',
          '-i',
          env.AUTHKIT_DB_CONTAINER,
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-X',
          '-qAt',
          '-v',
          'ON_ERROR_STOP=1',
        ]
      : ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'];
    // PG* via environment keeps database credentials out of argv and output.
    const child = spawn(command, params, {
      env: {
        ...env,
        ...(env.AUTHKIT_DATABASE_URL ? { PGDATABASE: env.AUTHKIT_DATABASE_URL } : {}),
      },
    });
    let stdout = '',
      stderr = '';
    let readyResolve, readyReject;
    const ready = new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });
    ready.catch(() => {});
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.includes('AUTHKIT_LOCK_HELD')) readyResolve();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const done = new Promise((resolve, reject) => {
      child.on('error', (error) => {
        readyReject(error);
        reject(error);
      });
      child.on('close', (code) => {
        readyReject(new Error('SQL process finished before lock barrier'));
        resolve({ code, stdout, stderr });
      });
    });
    child.stdin.on('error', () => {});
    child.stdin.write(sql + '\n');
    if (!keepOpen) child.stdin.end();
    return { done, ready, commit: () => child.stdin.end('commit;\n') };
  }
  const identity = (user) =>
    `set local role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: user.id, role: 'authenticated' })}', true);`;
  async function race(label, firstUser, firstSql, secondUser, secondSql, isolation = '') {
    const first = sqlProcess(
      `begin ${isolation}; set local statement_timeout = '10s'; set local idle_in_transaction_session_timeout = '15s'; ${identity(firstUser)} ${firstSql}; select 'AUTHKIT_LOCK_HELD';`,
      true,
    );
    await first.ready;
    const tag = `authkit-race-${runId}`;
    const second = sqlProcess(
      `set application_name = '${tag}'; begin ${isolation}; set local statement_timeout = '10s'; ${identity(secondUser)} ${secondSql}; commit;`,
    );
    try {
      // Observe an actual lock wait before releasing the first transaction.
      // This is a barrier, not a race dependent on an arbitrary sleep duration.
      let blocked = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        const probe = await sqlProcess(
          `select exists (select 1 from pg_stat_activity where application_name = '${tag}' and wait_event_type = 'Lock');`,
        ).done;
        assert.equal(probe.code, 0, probe.stderr);
        if (probe.stdout.trim() === 't') {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.ok(blocked, `${label}: second transaction never waited on the first`);
    } finally {
      first.commit();
      await Promise.all([first.done, second.done]);
    }
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.stderr);
    assert.notEqual(b.code, 0, `${label}: both transactions succeeded`);
    assert.match(b.stderr, /last owner|Only owners|could not serialize/);
    pass(label);
  }

  // Fail before creating fixtures when the SQL transport is unavailable.
  assert.equal((await sqlProcess('select 1;').done).code, 0, 'SQL connection failed');
  if (env.AUTHKIT_LEGACY === '1') {
    assert.equal(
      good(await request('/rest/v1/user_roles?role=eq.admin', service)).length,
      0,
      'Legacy tests require an isolated stack with no pre-existing platform admins.',
    );
  }
  try {
    const owner = await createUser('owner');
    const admin = await createUser('admin');
    const reader = await createUser('reader');
    const outsider = await createUser('outsider');
    const A = await organization(owner, 'Organization A');
    const B = await organization(owner, 'Organization B');
    assert.equal(good(await member(A, owner))[0].role, 'owner');
    pass('organization creation atomically assigns its owner');
    await denied('invalid organization creation leaves no orphan', () =>
      rpc('create_organization', owner, { p_name: ' ' }),
    );
    good(await rpc('add_organization_member', owner, args(A, admin, 'admin')));
    good(await rpc('add_organization_member', owner, args(B, admin, 'member')));
    good(await rpc('add_organization_member', admin, args(A, reader, 'member')));
    assert.equal(good(await member(A, admin))[0].role, 'admin');
    assert.equal(good(await member(B, admin))[0].role, 'member');
    pass('multiple memberships carry independent roles; admin adds ordinary members');
    await denied('duplicate organization/user membership rejected', () =>
      rpc('add_organization_member', owner, args(A, admin, 'member')),
    );
    await denied('member cannot add members in B', () =>
      rpc('add_organization_member', admin, args(B, outsider, 'member')),
    );
    await denied('admin cannot assign admin', () =>
      rpc('add_organization_member', admin, args(A, outsider, 'admin')),
    );
    await denied('admin cannot assign owner', () =>
      rpc('add_organization_member', admin, args(A, outsider, 'owner')),
    );
    await denied('admin cannot self-promote', () =>
      rpc('set_organization_member_role', admin, args(A, admin, 'owner')),
    );
    await denied('member cannot self-promote', () =>
      rpc('set_organization_member_role', reader, args(A, reader, 'admin')),
    );
    await denied('admin cannot remove owner', () =>
      rpc('remove_organization_member', admin, args(A, owner)),
    );
    await denied('member cannot remove another member', () =>
      rpc('remove_organization_member', reader, args(A, admin)),
    );
    await denied('direct membership insert rejected', () =>
      table('organization_memberships', admin, 'POST', {
        organization_id: B,
        user_id: outsider.id,
        role: 'owner',
      }),
    );
    await denied('direct membership update rejected', () =>
      table(
        'organization_memberships',
        admin,
        'PATCH',
        { role: 'owner' },
        `organization_id=eq.${A}`,
      ),
    );
    await denied('direct membership delete rejected', () =>
      table('organization_memberships', admin, 'DELETE', undefined, `organization_id=eq.${A}`),
    );
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      await denied(`direct organization ${method} rejected`, () =>
        table(
          'organizations',
          owner,
          method,
          method === 'DELETE' ? undefined : { name: 'forged' },
          `id=eq.${A}`,
        ),
      );
    }
    const pa = good(
      await table('organization_projects', admin, 'POST', {
        organization_id: A,
        name: 'A project',
      }),
    )[0];
    const pb = good(
      await table('organization_projects', owner, 'POST', {
        organization_id: B,
        name: 'B project',
      }),
    )[0];
    assert.equal(good(await table('organization_projects', reader))[0].id, pa.id);
    assert.equal(good(await table('organization_projects', admin)).length, 2);
    pass('authorized project reads and creates; switching does not merge permissions');
    assert.deepEqual(
      good(await table('organization_projects', reader, 'GET', undefined, `id=eq.${pb.id}`)),
      [],
    );
    assert.deepEqual(good(await table('organizations', outsider)), []);
    assert.deepEqual(good(await table('organization_memberships', outsider)), []);
    pass('cross-tenant SELECT hides projects, organizations and memberships');
    await denied('cross-tenant INSERT rejected', () =>
      table('organization_projects', reader, 'POST', { organization_id: B, name: 'forged' }),
    );
    await denied(
      'cross-tenant UPDATE leaves target unchanged',
      () => table('organization_projects', reader, 'PATCH', { name: 'forged' }, `id=eq.${pb.id}`),
      true,
    );
    await denied(
      'cross-tenant DELETE leaves target unchanged',
      () => table('organization_projects', reader, 'DELETE', undefined, `id=eq.${pb.id}`),
      true,
    );
    await denied('admin in A cannot INSERT in B', () =>
      table('organization_projects', admin, 'POST', { organization_id: B, name: 'forged' }),
    );
    await denied(
      'admin in A cannot UPDATE in B',
      () => table('organization_projects', admin, 'PATCH', { name: 'forged' }, `id=eq.${pb.id}`),
      true,
    );
    await denied(
      'admin in A cannot DELETE in B',
      () => table('organization_projects', admin, 'DELETE', undefined, `id=eq.${pb.id}`),
      true,
    );
    await denied('even owner of both cannot move projects', () =>
      table('organization_projects', owner, 'PATCH', { organization_id: B }, `id=eq.${pa.id}`),
    );
    const ta = good(
      await table('organization_tasks', admin, 'POST', {
        organization_id: A,
        project_id: pa.id,
        title: 'Task A',
      }),
    )[0];
    const tb = good(
      await table('organization_tasks', owner, 'POST', {
        organization_id: B,
        project_id: pb.id,
        title: 'Task B',
      }),
    )[0];
    assert.deepEqual(
      good(await table('organization_tasks', reader, 'GET', undefined, `id=eq.${tb.id}`)),
      [],
    );
    pass('task SELECT is tenant isolated');
    await denied('cross-tenant task INSERT rejected', () =>
      table('organization_tasks', reader, 'POST', {
        organization_id: B,
        project_id: pb.id,
        title: 'forged',
      }),
    );
    await denied(
      'cross-tenant task UPDATE rejected',
      () => table('organization_tasks', reader, 'PATCH', { title: 'forged' }, `id=eq.${tb.id}`),
      true,
    );
    await denied(
      'cross-tenant task DELETE rejected',
      () => table('organization_tasks', reader, 'DELETE', undefined, `id=eq.${tb.id}`),
      true,
    );
    await denied('same-tenant member task write rejected', () =>
      table('organization_tasks', reader, 'POST', {
        organization_id: A,
        project_id: pa.id,
        title: 'forged',
      }),
    );
    await denied('cross-tenant parent on INSERT rejected', () =>
      table('organization_tasks', owner, 'POST', {
        organization_id: A,
        project_id: pb.id,
        title: 'forged',
      }),
    );
    await denied('cross-tenant parent on UPDATE rejected', () =>
      table('organization_tasks', owner, 'PATCH', { project_id: pb.id }, `id=eq.${ta.id}`),
    );
    await denied('task tenant cannot change', () =>
      table(
        'organization_tasks',
        owner,
        'PATCH',
        { organization_id: B, project_id: pb.id },
        `id=eq.${ta.id}`,
      ),
    );
    assert.equal(
      good(
        await table(
          'organization_tasks',
          admin,
          'PATCH',
          { title: 'Updated task' },
          `id=eq.${ta.id}`,
        ),
      )[0].title,
      'Updated task',
    );
    assert.equal(
      good(await table('organization_tasks', admin, 'DELETE', undefined, `id=eq.${ta.id}`))[0].id,
      ta.id,
    );
    assert.equal(
      good(
        await table(
          'organization_projects',
          admin,
          'PATCH',
          { name: 'Updated project' },
          `id=eq.${pa.id}`,
        ),
      )[0].name,
      'Updated project',
    );
    pass('authorized project/task UPDATE and task DELETE work');
    good(await rpc('remove_organization_member', admin, args(A, reader)));
    assert.deepEqual(good(await table('organization_projects', reader)), []);
    assert.deepEqual(good(await table('organization_memberships', reader)), []);
    await denied('removed membership cannot write using the same JWT', () =>
      table('organization_projects', reader, 'POST', { organization_id: A, name: 'forged' }),
    );
    await denied('removed membership cannot call management RPC', () =>
      rpc('add_organization_member', reader, args(A, outsider, 'member')),
    );
    pass('membership revocation takes effect without refreshing the JWT');
    await denied('last owner cannot leave', () =>
      rpc('remove_organization_member', owner, args(A, owner)),
    );
    await denied('last owner cannot demote themselves', () =>
      rpc('set_organization_member_role', owner, args(A, owner, 'member')),
    );
    await denied('transfer requires existing membership', () =>
      rpc('transfer_organization_ownership', owner, args(A, outsider)),
    );
    await denied('non-owner cannot transfer', () =>
      rpc('transfer_organization_ownership', admin, args(A, admin)),
    );
    good(await rpc('transfer_organization_ownership', owner, args(A, admin)));
    assert.equal(good(await member(A, admin))[0].role, 'owner');
    assert.equal(good(await member(A, owner))[0].role, 'admin');
    pass('atomic ownership transfer promotes target and demotes caller');
    good(await rpc('set_organization_member_role', admin, args(A, owner, 'owner')));
    pass('owner can assign privileged roles');
    const C = await organization(owner, 'Concurrent removal');
    good(await rpc('add_organization_member', owner, args(C, admin, 'owner')));
    await race(
      'concurrent owner removals retain one owner',
      owner,
      `select public.remove_organization_member('${C}', '${owner.id}')`,
      admin,
      `select public.remove_organization_member('${C}', '${admin.id}')`,
    );
    assert.equal(
      good(
        await request(
          `/rest/v1/organization_memberships?organization_id=eq.${C}&role=eq.owner`,
          service,
        ),
      ).length,
      1,
    );
    for (const isolation of ['', 'isolation level repeatable read']) {
      const D = await organization(owner, `Concurrent demotion ${isolation}`);
      good(await rpc('add_organization_member', owner, args(D, admin, 'owner')));
      await race(
        `concurrent demotions protect last owner (${isolation || 'read committed'})`,
        owner,
        `select public.set_organization_member_role('${D}', '${owner.id}', 'member')`,
        admin,
        `select public.set_organization_member_role('${D}', '${admin.id}', 'member')`,
        isolation,
      );
      assert.equal(
        good(
          await request(
            `/rest/v1/organization_memberships?organization_id=eq.${D}&role=eq.owner`,
            service,
          ),
        ).length,
        1,
      );
    }
    const E = await organization(owner, 'Concurrent transfer');
    good(await rpc('add_organization_member', owner, args(E, admin, 'member')));
    good(await rpc('add_organization_member', owner, args(E, reader, 'member')));
    await race(
      'concurrent transfers recheck caller after lock',
      owner,
      `select public.transfer_organization_ownership('${E}', '${admin.id}')`,
      owner,
      `select public.transfer_organization_ownership('${E}', '${reader.id}')`,
    );
    assert.equal(good(await member(E, admin))[0].role, 'owner');
    assert.equal(good(await member(E, reader))[0].role, 'member');
    for (const name of [
      'organizations',
      'organization_memberships',
      'organization_projects',
      'organization_tasks',
    ]) {
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
        await denied(`anonymous ${name} ${method} denied`, () =>
          table(name, null, method, ['POST', 'PATCH'].includes(method) ? {} : undefined),
        );
      }
    }
    for (const [name, body] of [
      ['create_organization', { p_name: 'anonymous' }],
      ['add_organization_member', args(A, outsider, 'owner')],
      ['set_organization_member_role', args(A, admin, 'member')],
      ['remove_organization_member', args(A, admin)],
      ['transfer_organization_ownership', args(A, outsider)],
    ])
      await denied(`anonymous RPC ${name} denied`, () => rpc(name, null, body));
    assert.equal(
      good(await table('organization_projects', admin, 'DELETE', undefined, `id=eq.${pa.id}`))[0]
        .id,
      pa.id,
    );
    pass('authorized project DELETE works');

    if (env.AUTHKIT_LEGACY === '1') {
      assert.equal(
        good(await request(`/rest/v1/user_roles?user_id=eq.${owner.id}`, service))[0].role,
        'user',
      );
      pass('signup metadata does not assign platform admin');
      const signup = good(
        await request('/auth/v1/signup', anon, 'POST', {
          email: `authkit-signup-${runId}@example.test`,
          password,
          data: { intended_role: 'admin' },
        }),
      );
      const signupUser = signup.user ?? signup;
      users.push({ id: signupUser.id });
      assert.equal(
        good(await request(`/rest/v1/user_roles?user_id=eq.${signupUser.id}`, service))[0].role,
        'user',
      );
      pass('public signup cannot request platform admin in metadata');
      await denied('auth hook cannot be invoked as an ordinary user', () =>
        rpc('custom_access_token_hook', outsider, { event: {} }),
      );
      await denied('direct platform role writes rejected', () =>
        table('user_roles', outsider, 'PATCH', { role: 'admin' }, `user_id=eq.${outsider.id}`),
      );

      await denied('grant_role skip_auth_check bypass removed', () =>
        rpc('grant_role', outsider, {
          p_user_id: outsider.id,
          p_role: 'admin',
          skip_auth_check: true,
        }),
      );
      await denied('ordinary user cannot grant platform role', () =>
        rpc('grant_role', outsider, { p_user_id: outsider.id, p_role: 'admin' }),
      );
      await denied('anonymous cannot grant platform role', () =>
        rpc('grant_role', null, { p_user_id: outsider.id, p_role: 'admin' }),
      );
      await denied('non-admin cannot list identities', () =>
        rpc('get_all_auth_users', outsider, {}),
      );
      await denied('non-admin cannot update identities', () =>
        rpc('update_user', outsider, { user_id_in: owner.id, new_role_in: 'admin' }),
      );
      await denied('delete_user no longer available to clients', () =>
        rpc('delete_user', outsider, { user_id_in: owner.id }),
      );
      good(
        await request(`/rest/v1/user_roles?user_id=eq.${outsider.id}`, service, 'PATCH', {
          role: 'admin',
        }),
      );
      outsider.token = good(
        await request('/auth/v1/token?grant_type=password', anon, 'POST', {
          email: outsider.email,
          password,
        }),
      ).access_token;
      await denied('last platform admin cannot self-demote', () =>
        rpc('grant_role', outsider, { p_user_id: outsider.id, p_role: 'user' }),
      );
      await denied('platform admin cannot update Auth identity through legacy RPC', () =>
        rpc('update_user', outsider, { user_id_in: owner.id, new_email_in: 'forged@example.test' }),
      );
      good(await rpc('grant_role', outsider, { p_user_id: reader.id, p_role: 'admin' }));
      assert.equal(
        good(await request(`/rest/v1/user_roles?user_id=eq.${reader.id}`, service))[0].role,
        'admin',
      );
      assert.deepEqual(good(await table('organizations', outsider)), []);
      pass('platform admin grants roles but has no implicit tenant access');
      good(
        await request(`/rest/v1/user_roles?user_id=eq.${outsider.id}`, service, 'PATCH', {
          role: 'user',
        }),
      );
      await denied('stale platform admin JWT cannot grant roles after revocation', () =>
        rpc('grant_role', outsider, { p_user_id: outsider.id, p_role: 'admin' }),
      );
      await denied('stale platform admin JWT cannot enumerate identities', () =>
        rpc('get_all_auth_users', outsider, {}),
      );
    }
    const grants =
      await sqlProcess(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'authkit_private') and p.prosecdef
      and (has_function_privilege('anon', p.oid, 'execute') or p.proconfig is null or not ('search_path=""' = any(p.proconfig)));`)
        .done;
    assert.equal(grants.code, 0, grants.stderr);
    assert.equal(grants.stdout.trim(), '0');
    pass('privileged functions have fixed search paths and no anonymous execute grants');
    console.log(`Authorization suite passed: ${count} checks.`);
  } finally {
    // Only generated fixture IDs are interpolated; SQL transport is privileged.
    // Disable triggers transaction-locally to remove the fixtures' last owners.
    if (orgs.length) {
      const ids = orgs.map((id) => `'${id}'`).join(',');
      const result = await sqlProcess(`begin; set local session_replication_role = replica;
        delete from public.organization_tasks where organization_id in (${ids});
        delete from public.organization_projects where organization_id in (${ids});
        delete from public.organization_memberships where organization_id in (${ids});
        delete from public.organizations where id in (${ids}); commit;`).done;
      assert.equal(result.code, 0, 'Fixture cleanup failed: ' + result.stderr);
    }
    for (const user of users)
      good(await request(`/auth/v1/admin/users/${user.id}`, service, 'DELETE'));
  }
}
