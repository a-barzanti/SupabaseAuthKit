import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <h2 className="font-bold text-2xl mb-4">Admin Dashboard</h2>
      <p>
        Welcome to the admin area. From here you can manage various aspects of your application.
      </p>
      <p>Capabilities include:</p>
      <ul className="list-disc list-inside">
        <li>User Management: Add, edit, and delete user accounts.</li>
        <li>Settings Configuration: (Coming soon)</li>
      </ul>
      <p>
        Navigate to the{' '}
        <Link href="/admin/users" className="text-blue-500 hover:underline">
          User Management
        </Link>{' '}
        page to manage users.
      </p>
    </div>
  );
}
