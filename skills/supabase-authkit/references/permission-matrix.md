# Permission matrix

Roles in this table are **current memberships in the affected organization**. A user with no membership has no organization access, including a platform admin. All anonymous access is denied. Authenticated nonmembers may only create a new organization (with themselves as owner). Supabase anonymous sign-in is disabled in the supported setup; `create_organization` also rejects anonymous Auth identities.

| Operation | Owner | Admin | Member |
| --- | --- | --- | --- |
| Create organization | Yes, creator becomes owner | Yes, creator becomes owner | Yes, creator becomes owner |
| Read organization and member UUIDs/roles | Yes | Yes | Yes |
| Switch active organization | Any of own current memberships | Same | Same |
| Add existing user as member | Yes | Yes | No |
| Add existing user as admin/owner | Yes | No | No |
| Change membership role, including privileged roles | Yes | No | No |
| Self-promotion | Already owner | No | No |
| Remove another member | Any role, subject to last-owner guard | Member only | No |
| Leave organization | Unless last owner | Yes | Yes |
| Demote/remove owner | Unless last owner | No | No |
| Transfer own ownership to existing member | Yes; target owner, caller admin | No | No |
| Transfer to self/nonmember | No | No | No |
| Read projects/tasks | Yes | Yes | Yes |
| Create/update/delete projects/tasks | Yes | Yes | No |
| Move a project/task between organizations | No | No | No |
| Link task to another organization's project | No | No | No |
| Direct INSERT/UPDATE/DELETE organizations/memberships | No; RPCs only | No | No |
| Rename/delete organization | Not implemented | Not implemented | Not implemented |
| Enumerate global Auth emails or change platform roles | No organization role grants this | Same | Same |

All role changes and removals are serialized per organization. Both sequential and concurrent last-owner changes fail. An owner may create additional owners; ownership transfer affects only caller and target. Constraints/grants enforce immutable membership identities and tenant IDs. Denied UPDATE/DELETE may return zero rows instead of an error; verify unchanged data.

## Separate retained platform permissions (legacy upgrades only)

| Operation | Platform admin | Platform user / organization role alone | Anonymous |
| --- | --- | --- | --- |
| Read own profile; update own username | Yes | Yes | No |
| Read own current platform role | Yes | Yes | No |
| List all identities and profiles | Yes | No | No |
| Update other profiles' usernames | Yes | No | No |
| Assign platform admin/user role | Yes, cannot demote last platform admin | No | No |
| Direct role/permission writes | No | No | No |
| Change profile ID | No | No | No |
| Create privileged identity via signup metadata | No | No | No |
| Change another identity's email/password or delete account via old RPC | No | No | No |
| Read or manage a tenant without membership | No | No | No |

Platform roles use current database state too. Public email/password signup, login, confirmation, password recovery and updating one's own password remain Auth operations; they grant no organization membership automatically. Auth hook execution is reserved for the Auth service. Service administration is outside the browser permission matrix.
