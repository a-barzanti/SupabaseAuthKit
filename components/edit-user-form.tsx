'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserData } from './user-list'; // Import UserData from user-list

interface EditUserFormProps {
  user: Omit<UserData, 'password'>;
  onSave: (user: UserData) => void;
  onCancel: () => void;
}

export function EditUserForm({ user, onSave, onCancel }: EditUserFormProps) {
  const [email, setEmail] = useState(user.email || '');
  const [username, setUsername] = useState(user.username || '');
  const [role, setRole] = useState<'user' | 'admin'>(user.role || 'user');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, email, username, role });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4" autoComplete="off">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">
          Email
        </Label>
        <Input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="col-span-3"
          type="email"
          autoComplete="new-email"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="username" className="text-right">
          Username
        </Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="col-span-3"
          autoComplete="new-username"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">
          Role
        </Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
          className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="password" className="text-right">
          New Password
        </Label>
        <Input
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="col-span-3"
          type="password"
          placeholder="Leave blank to keep current password"
          autoComplete="new-password"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  );
}
