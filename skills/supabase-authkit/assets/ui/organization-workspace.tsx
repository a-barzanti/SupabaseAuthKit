'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { createBrowserClient } from '@supabase/ssr';

export type OrganizationRole = 'owner' | 'admin' | 'member';
export type Organization = { id: string; name: string };
export type Membership = { user_id: string; role: OrganizationRole };
export type Project = { id: string; name: string };

// Pass an ordinary, cookie-backed browser client from a client component wrapper.
// The selected organization is context; all calls are authorized by Postgres.
export function OrganizationWorkspace({
  client,
  userId,
  organizations,
  active,
  members,
  projects,
}: {
  client: ReturnType<typeof createBrowserClient>;
  userId: string;
  organizations: Organization[];
  active: string | null;
  members: Membership[];
  projects: Project[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const role = members.find((member) => member.user_id === userId)?.role;
  const canManage = role === 'owner' || role === 'admin';
  const control = 'rounded border bg-background px-3 py-2';

  function run(work: () => PromiseLike<{ error: { message: string } | null }>) {
    setMessage('');
    startTransition(async () => {
      try {
        const { error } = await work();
        setMessage(error ? error.message : 'Saved.');
      } catch {
        setMessage('Unable to reach the server. Please try again.');
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold">Your organizations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your user ID: <code>{userId}</code>
        </p>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <fieldset disabled={pending} className="flex flex-col gap-8 disabled:opacity-60">
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get('name') ?? '');
            run(async () => {
              const result = await client.rpc('create_organization', { p_name: name });
              if (!result.error) router.push(`?organization=${result.data}`);
              return result;
            });
          }}
        >
          <label className="flex flex-col gap-1">
            New organization
            <input className={control} name="name" required maxLength={100} />
          </label>
          <button className={control} type="submit">
            Create organization
          </button>
        </form>
        {organizations.length > 0 ? (
          <label className="flex flex-col gap-1">
            Active organization
            <select
              className={control}
              value={active ?? ''}
              onChange={(event) => {
                setMessage('');
                router.push(`?organization=${event.target.value}`);
              }}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>Create an organization to get started.</p>
        )}
        {active && (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Members · your role: {role}</h2>
              {canManage && (
                <form
                  className="flex flex-wrap gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    run(() =>
                      client.rpc('add_organization_member', {
                        p_organization_id: active,
                        p_user_id: form.get('user_id'),
                        p_role: form.get('role'),
                      }),
                    );
                  }}
                >
                  <label className="flex flex-col gap-1">
                    Existing user ID
                    <input
                      className={control}
                      name="user_id"
                      required
                      placeholder="UUID from their account"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    Membership role
                    <select
                      aria-label="Membership role"
                      className={control}
                      name="role"
                      defaultValue="member"
                    >
                      <option value="member">Member</option>
                      {role === 'owner' && (
                        <>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </>
                      )}
                    </select>
                  </label>
                  <button className={control}>Add member</button>
                </form>
              )}
              <ul className="flex flex-col gap-3">
                {members.map((member) => (
                  <li
                    className="rounded border p-3 flex flex-wrap items-center gap-3"
                    key={member.user_id}
                  >
                    <code className="text-sm break-all">{member.user_id}</code>
                    <span>
                      {member.role}
                      {member.user_id === userId ? ' (you)' : ''}
                    </span>
                    {role === 'owner' && (
                      <>
                        <select
                          aria-label={`Role for ${member.user_id}`}
                          className={control}
                          value={member.role}
                          onChange={(event) =>
                            run(() =>
                              client.rpc('set_organization_member_role', {
                                p_organization_id: active,
                                p_user_id: member.user_id,
                                p_role: event.target.value,
                              }),
                            )
                          }
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        {member.user_id !== userId && (
                          <button
                            className={control}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Transfer your ownership to this member? Your role becomes admin.',
                                )
                              )
                                run(() =>
                                  client.rpc('transfer_organization_ownership', {
                                    p_organization_id: active,
                                    p_user_id: member.user_id,
                                  }),
                                );
                            }}
                          >
                            Transfer ownership
                          </button>
                        )}
                      </>
                    )}
                    {(member.user_id === userId ||
                      role === 'owner' ||
                      (role === 'admin' && member.role === 'member')) && (
                      <button
                        className={control}
                        onClick={() => {
                          if (window.confirm('Remove this membership?'))
                            run(() =>
                              client.rpc('remove_organization_member', {
                                p_organization_id: active,
                                p_user_id: member.user_id,
                              }),
                            );
                        }}
                      >
                        {member.user_id === userId ? 'Leave' : 'Remove'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Projects</h2>
              <p>Members can read projects. Owners and admins can manage them.</p>
              {canManage && (
                <form
                  className="flex gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = String(new FormData(event.currentTarget).get('name') ?? '');
                    run(() =>
                      client
                        .from('organization_projects')
                        .insert({ organization_id: active, name }),
                    );
                  }}
                >
                  <label>
                    Project name <input className={control} name="name" required maxLength={120} />
                  </label>
                  <button className={control}>Create project</button>
                </form>
              )}
              <ul>
                {projects.map((project) => (
                  <li key={project.id} className="flex gap-3 items-center py-2">
                    <span>{project.name}</span>
                    {canManage && (
                      <>
                        <button
                          className={control}
                          onClick={() => {
                            const name = window.prompt('Project name', project.name);
                            if (name)
                              run(() =>
                                client
                                  .from('organization_projects')
                                  .update({ name })
                                  .eq('organization_id', active)
                                  .eq('id', project.id),
                              );
                          }}
                        >
                          Rename
                        </button>
                        <button
                          className={control}
                          onClick={() => {
                            if (window.confirm('Delete this project and its tasks?'))
                              run(() =>
                                client
                                  .from('organization_projects')
                                  .delete()
                                  .eq('organization_id', active)
                                  .eq('id', project.id),
                              );
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </fieldset>
    </div>
  );
}
