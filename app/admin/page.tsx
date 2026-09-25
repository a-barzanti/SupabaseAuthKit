import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Platform administration</h1>
      <p>
        Manage platform roles and profiles. Organization permissions come from separate memberships.
      </p>
      <Link className="underline" href="/admin/users">
        Manage platform users
      </Link>
      <Link className="underline" href="/protected">
        Your organizations
      </Link>
    </div>
  );
}
