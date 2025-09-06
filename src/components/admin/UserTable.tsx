import React, { useState } from 'react';
import { type UserProfile } from '../../services/userManagementService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { MoreHorizontal, Edit, Shield, UserX, Power, PowerOff, Trash2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserTableProps {
  users: UserProfile[];
  onEditUser: (user: UserProfile) => void;
  onRoleChange: (userId: string, newRole: 'admin' | 'member') => void;
  onStatusToggle: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserTable({ users, onEditUser, onRoleChange, onStatusToggle, onDeleteUser }: UserTableProps) {
  const [sortField, setSortField] = useState<keyof UserProfile>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort users based on current sort settings
  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: keyof UserProfile) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      case 'deleted':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Deleted</Badge>;
      case 'orphaned':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">Orphaned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">Admin</Badge>;
      case 'member':
        return <Badge variant="outline">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatLastSeen = (date: string | null) => {
    if (!date) return 'Never';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('full_name')}
              >
                User
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('email')}
              >
                Email
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                Role
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                Status
              </TableHead>
              <TableHead>Department</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('last_sign_in')}
              >
                Last Seen
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('created_at')}
              >
                Joined
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 transition-colors">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                      {user.job_title && (
                        <div className="text-sm text-gray-500">{user.job_title}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-gray-900">{user.email}</span>
                    {user.email_confirmed ? (
                      <span className="text-xs text-green-600">Verified</span>
                    ) : (
                      <span className="text-xs text-orange-600">Unverified</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>
                  <span className="text-gray-600">{user.company || 'Not specified'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">{formatLastSeen(user.last_sign_in)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onEditUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {user.role === 'member' ? (
                        <DropdownMenuItem onClick={() => onRoleChange(user.user_id, 'admin')}>
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onRoleChange(user.user_id, 'member')}>
                          <UserX className="mr-2 h-4 w-4" />
                          Remove Admin
                        </DropdownMenuItem>
                      )}
                      
                      {user.status === 'active' ? (
                        <DropdownMenuItem onClick={() => onStatusToggle(user.user_id)}>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onStatusToggle(user.user_id)}>
                          <Power className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => onDeleteUser(user.user_id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
        </div>
      )}
    </div>
  );
}