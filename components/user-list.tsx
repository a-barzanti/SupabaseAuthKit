'use client';

import { useState } from 'react';

import { usePagination } from '@/lib/hooks/use-pagination';
import { useSearch } from '@/lib/hooks/use-search';
import { updateUserProfile } from '@/lib/actions/user-actions';
import type { UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UserList({ initialUsers }: { initialUsers: UserData[] }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const { searchQuery, setSearchQuery, filteredItems } = useSearch(initialUsers, {
    searchFields: ['email', 'username'],
  });
  const {
    paginatedItems,
    currentPage,
    totalPages,
    handleNextPage,
    handlePrevPage,
    setCurrentPage,
  } = usePagination(filteredItems);
  return (
    <div className="flex flex-col gap-4">
      <p>
        Platform roles are separate from organization roles. These roles do not grant tenant access.
      </p>
      <p>
        Users register themselves. Identity changes and account deletion require trusted server
        administration.
      </p>
      <p role="status">{message}</p>
      <Input
        aria-label="Search platform users"
        placeholder="Search email or username"
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setCurrentPage(1);
        }}
      />
      {paginatedItems.map((user) => (
        <form
          key={user.id}
          className="flex flex-wrap gap-3 items-end border rounded p-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setPending(true);
            const result = await updateUserProfile({
              id: user.id,
              username: String(data.get('username')),
              role: data.get('role') as 'admin' | 'user',
            });
            setMessage(result.error ?? 'Saved. Platform permissions apply immediately.');
            setPending(false);
          }}
        >
          <span>{user.email}</span>
          <label>
            Username
            <Input name="username" defaultValue={user.username ?? ''} />
          </label>
          <label>
            Platform role
            <select
              name="role"
              defaultValue={user.role}
              className="block border rounded p-2 bg-background"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button disabled={pending}>Save</Button>
        </form>
      ))}
      <div className="flex gap-3 items-center">
        <Button variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1}>
          Previous
        </Button>
        <span>
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        <Button variant="outline" onClick={handleNextPage} disabled={currentPage >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}
