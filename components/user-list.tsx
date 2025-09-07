'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';

import { deleteUser, updateUserProfile } from '@/lib/actions/user-actions';
import { usePagination } from '@/lib/hooks/use-pagination';
import { useSearch } from '@/lib/hooks/use-search';
import { UserData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

import { EditUserForm } from './edit-user-form';
import { AddUserForm } from './add-user-form';

interface UserListProps {
  initialUsers: UserData[];
}

export function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { searchQuery, setSearchQuery, filteredItems } = useSearch(users, {
    searchFields: ['email', 'username'],
  });

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    handleNextPage,
    handlePrevPage,
    handleItemsPerPageChange,
  } = usePagination(filteredItems);

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const { error, success } = await deleteUser(userId);

      if (error) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user: ${error}`);
      } else if (success) {
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
    const { error, success } = await updateUserProfile({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      username: updatedUser.username || undefined,
    });

    if (error) {
      console.error('Error updating user:', error);
      alert(`Error updating user: ${error}`);
      return;
    }

    if (success) {
      alert('User updated successfully!');
      setIsEditDialogOpen(false);
      setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    }
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
              {paginatedItems.map((user) => (
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
