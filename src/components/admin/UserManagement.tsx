import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, Edit, Trash2, MoreHorizontal, UserCheck, UserX, Shield, User } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { userManagementService, CreateUserData, UpdateUserData, UserProfile, UsersResponse } from '@/services/userManagementService'

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<{ total_count: number; admin_count: number; member_count: number; active_count: number }>(
    { total_count: 0, admin_count: 0, member_count: 0, active_count: 0 }
  )
  
  // Load users on component mount
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    password: '',
    fullName: '',
    role: 'member',
    jobTitle: '',
    department: '',
    phone: ''
  })

  // Edit user form state
  const [editForm, setEditForm] = useState<UpdateUserData>({
    email: '',
    fullName: '',
    role: 'member',
    jobTitle: '',
    department: '',
    status: 'active'
  })

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response: UsersResponse = await userManagementService.getAllUsers()
      setUsers(response.users)
      setUserStats({
        total_count: response.total_count,
        admin_count: response.admin_count,
        member_count: response.member_count,
        active_count: response.active_count
      })
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!createForm.email || !createForm.password || !createForm.fullName) {
        toast.error('Email, password, and full name are required.')
        return
      }

      await userManagementService.createUser(createForm)
      toast.success('User created successfully')
      
      setIsCreateDialogOpen(false)
      setCreateForm({
        email: '',
        password: '',
        fullName: '',
        role: 'member',
        jobTitle: '',
        department: '',
        phone: ''
      })
      await loadUsers()
    } catch (error) {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user. Please try again.')
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      await userManagementService.updateUser(selectedUser.user_id, editForm)
      toast.success('User updated successfully')
      
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Failed to update user. Please try again.')
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await userManagementService.changeUserRole(userId, newRole)
      toast.success(`User role changed to ${newRole}`)
      await loadUsers()
    } catch (error) {
      console.error('Failed to change user role:', error)
      toast.error('Failed to change user role. Please try again.')
    }
  }

  const handleToggleStatus = async (userId: string) => {
    try {
      await userManagementService.toggleUserStatus(userId)
      toast.success('User status updated')
      await loadUsers()
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      toast.error('Failed to update user status. Please try again.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await userManagementService.deleteUser(userId)
      toast.success('User deactivated successfully')
      await loadUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast.error('Failed to deactivate user. Please try again.')
    }
  }

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user)
    setEditForm({
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      jobTitle: user.job_title || '',
      department: user.company || '',
      status: user.status
    })
    setIsEditDialogOpen(true)
  }

  const generatePassword = () => {
    const password = userManagementService.generateSecurePassword()
    setCreateForm({ ...createForm, password })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <span className="ml-2 text-muted-foreground">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{userStats.active_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{userStats.admin_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{userStats.member_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with full access credentials
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="col-span-3"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">Password</Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="password"
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Enter secure password"
                      />
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        Generate
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fullName" className="text-right">Full Name</Label>
                    <Input
                      id="fullName"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      className="col-span-3"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Role</Label>
                    <Select value={createForm.role} onValueChange={(value: 'admin' | 'member') => setCreateForm({ ...createForm, role: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jobTitle" className="text-right">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={createForm.jobTitle || ''}
                      onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })}
                      className="col-span-3"
                      placeholder="Software Developer"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department" className="text-right">Company</Label>
                    <Input
                      id="department"
                      value={createForm.department || ''}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      className="col-span-3"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={handleCreateUser}>Create User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.job_title || 'No title'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <><Shield className="mr-1 h-3 w-3" />Admin</>
                      ) : (
                        <><User className="mr-1 h-3 w-3" />Member</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status === 'active' ? (
                        <><UserCheck className="mr-1 h-3 w-3" />Active</>
                      ) : (
                        <><UserX className="mr-1 h-3 w-3" />Inactive</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleChange(user.user_id, user.role === 'admin' ? 'member' : 'admin')}>
                          <Shield className="mr-2 h-4 w-4" />
                          {user.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user.user_id)}>
                          {user.status === 'active' ? (
                            <><UserX className="mr-2 h-4 w-4" />Deactivate</>
                          ) : (
                            <><UserCheck className="mr-2 h-4 w-4" />Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.user_id)}
                          className="text-red-600"
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
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fullName" className="text-right">Full Name</Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName || ''}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">Role</Label>
              <Select value={editForm.role} onValueChange={(value: 'admin' | 'member') => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-jobTitle" className="text-right">Job Title</Label>
              <Input
                id="edit-jobTitle"
                value={editForm.jobTitle || ''}
                onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-department" className="text-right">Company</Label>
              <Input
                id="edit-department"
                value={editForm.department || ''}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">Status</Label>
              <Select value={editForm.status} onValueChange={(value: 'active' | 'inactive' | 'deleted') => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleEditUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
