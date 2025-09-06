/* TypeScript */
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { userManagementService, UserProfile } from '@/services/userManagementService'
import { Shield, User, Trash2, Plus } from 'lucide-react'

export function RoleManagementPanel() {
  const [roles, setRoles] = useState<Record<string, number>>({})
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    loadUsersAndRoles()
  }, [])

  const loadUsersAndRoles = async () => {
    try {
      setIsLoading(true)
      const resp = await userManagementService.getAllUsers()
      setUsers(resp.users)
      const map: Record<string, number> = {}
      resp.users.forEach((u) => {
        const r = u.role || 'member'
        map[r] = (map[r] || 0) + 1
      })
      setRoles(map)
      // default select first role
      const firstRole = Object.keys(map)[0] || 'member'
      setSelectedRole(firstRole)
    } catch (err) {
      console.error('Failed to load roles:', err)
      toast.error('Failed to load roles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRole = async () => {
    const role = newRole.trim()
    if (!role) {
      toast.error('Role name cannot be empty')
      return
    }
    // Roles are stored on profiles - creating a "role" here just ensures it appears in UI.
    setRoles((prev) => ({ ...prev, [role]: prev[role] || 0 }))
    setNewRole('')
    setSelectedRole(role)
    toast.success(`Role "${role}" created (assign it to users to activate)`)
  }

  const usersForSelectedRole = users.filter((u) => (u.role || 'member') === selectedRole)

  const handleChangeUserRole = async (userId: string, role: string) => {
    try {
      await userManagementService.changeUserRole(userId, role as any)
      toast.success('User role updated')
      await loadUsersAndRoles()
    } catch (err) {
      console.error('Failed to change user role:', err)
      toast.error('Failed to change user role')
    }
  }

  const handleDeleteRole = async (roleToDelete: string) => {
    if (!confirm(`Delete role "${roleToDelete}"? This will reassign users with this role to "member".`)) return
    try {
      const affected = users.filter((u) => (u.role || 'member') === roleToDelete)
      for (const u of affected) {
        await userManagementService.changeUserRole(u.user_id, 'member')
      }
      toast.success(`Role "${roleToDelete}" deleted and ${affected.length} users reassigned to member`)
      await loadUsersAndRoles()
    } catch (err) {
      console.error('Failed to delete role:', err)
      toast.error('Failed to delete role')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div>Loading roles...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>View existing roles and assign them to users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Select value={selectedRole || undefined} onValueChange={(v) => setSelectedRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(roles).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r} ({roles[r]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New role name"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <Button onClick={handleCreateRole} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create
              </Button>
              {selectedRole && selectedRole !== 'admin' && (
                <Button variant="destructive" onClick={() => handleDeleteRole(selectedRole)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </div>

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead> User </TableHead>
                  <TableHead> Email </TableHead>
                  <TableHead> Role </TableHead>
                  <TableHead className="text-right"> Actions </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersForSelectedRole.map((u) => (
                  <TableRow key={u.user_id || u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{u.full_name}</div>
                          <div className="text-sm text-muted-foreground">{u.job_title || 'No title'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={u.role} onValueChange={(val) => handleChangeUserRole(u.user_id, val as any)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(roles).map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                            <SelectItem value="member">member</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {usersForSelectedRole.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-6 text-center text-sm text-muted-foreground">No users with this role.</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RoleManagementPanel
