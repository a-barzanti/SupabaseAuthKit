'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';

import { createClient } from '@/lib/supabase/client';
import { createUser } from '@/lib/actions/user-actions'; // Import the server action
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface UserData {
  id: string;
  email: string;
  role: 'user' | 'admin';
  username: string | null; // Make username optional
}

interface UserListProps {
  initialUsers: UserData[];
}

export function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const supabase = createClient();
      const { error } = await supabase.rpc('delete_user', { user_id_in: userId });

      if (error) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user: ${error.message}`);
      } else {
        alert('User deleted successfully!');
        setUsers(users.filter((user) => user.id !== userId));
      }
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (updatedUser: UserData) => {
    const supabase = createClient();
    const { error: updateError } = await supabase.rpc('update_user', {
      user_id_in: updatedUser.id,
      new_email_in: updatedUser.email,
      new_role_in: updatedUser.role,
      new_username_in: updatedUser.username,
    });

    if (updateError) {
      console.error('Error updating user:', updateError);
      alert(`Error updating user: ${updateError.message}`);
      return;
    }

    alert('User updated successfully!');
    setIsEditDialogOpen(false);
    setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
  };

  const handleAddUserSuccess = (newUser: UserData) => {
    setUsers((prevUsers) => [...prevUsers, newUser]);
    setIsAddDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <Input
          placeholder="Search users..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>Add New User</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-t border-b">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role || 'user'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                      className="mr-2"
                    >
                      <Pencil1Icon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteUser(user.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end items-center px-6 py-4 space-x-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="items-per-page">Rows per page:</Label>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 text-right text-sm text-muted-foreground">
          {startIndex + 1}-{Math.min(endIndex, users.length)} of {users.length} users
        </div>
        <Button variant="outline" size="icon" onClick={handlePrevPage} disabled={currentPage === 1}>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </CardFooter>

      {editingUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Make changes to the user profile here. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <EditUserForm
              user={editingUser}
              onSave={handleUpdateUser}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <AddUserForm
            onSuccess={handleAddUserSuccess}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface EditUserFormProps {
  user: Omit<UserData, 'password'>;
  onSave: (user: UserData) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onSave, onCancel }: EditUserFormProps) {
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

interface AddUserFormProps {
  onSuccess: (newUser: UserData) => void;
  onCancel: () => void;
}

function AddUserForm({ onSuccess, onCancel }: AddUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  // const [message, setMessage] = useState('');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const { data, error } = await createUser(formData);

    if (error) {
      console.error('Error adding user:', error);
      alert(`Error adding user: ${error}`);
    } else if (data) {
      alert(`User ${data.email} added successfully!`);
      onSuccess(data);
      setEmail('');
      setPassword('');
      setRole('user');
    } else {
      alert('User registration initiated. Check email for confirmation.');
      onCancel();
      setEmail('');
      setPassword('');
      setRole('user');
    }
  };

  return (
    <form onSubmit={handleAddUser} className="space-y-4 py-4" autoComplete="off">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="new-email"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          id="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add User</Button>
      </DialogFooter>
    </form>
  );
}
