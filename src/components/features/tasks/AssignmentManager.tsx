import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsAdmin } from '@/hooks/useRoleVerification'
import { userService, User, useUsers } from '@/services/userService'
import DepartmentService, { Department } from '@/services/departmentService'
import { toast } from 'sonner'
import { 
  Users, 
  Building2, 
  UserPlus, 
  UserMinus, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  UserIcon
} from 'lucide-react'

interface AssignmentManagerProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onAssignmentUpdate: (taskId: string, newAssignments: string[]) => void
}

export function AssignmentManager({ task, isOpen, onClose, onAssignmentUpdate }: AssignmentManagerProps) {
  const { isAdmin } = useIsAdmin()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'department'>('individual')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Use React Query to fetch users
  const { data: users = [], isLoading: loadingUsers, error: usersError } = useUsers()

  // Show error if users failed to load
  useEffect(() => {
    if (usersError) {
      console.error('Failed to load users:', usersError)
      toast.error('Failed to load users. Please try refreshing the page.')
    }
  }, [usersError])

  // Initialize with current assignments
  useEffect(() => {
    if (task?.assigned_to) {
      setSelectedUsers(Array.isArray(task.assigned_to) ? task.assigned_to : [task.assigned_to])
    } else {
      setSelectedUsers([])
    }
  }, [task])

  // Load departments
  useEffect(() => {
    if (isAdmin && isOpen) {
      loadDepartments()
    }
  }, [isAdmin, isOpen])

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true)
      const fetchedDepartments = await DepartmentService.getDepartments()
      setDepartments(fetchedDepartments)
    } catch (error) {
      console.error('Error loading departments:', error)
      toast.error('Failed to load departments')
    } finally {
      setLoadingDepartments(false)
    }
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleDepartmentSelect = (departmentName: string) => {
    setSelectedDepartment(departmentName)
    // Auto-select all users in the department
    const deptUsers = DepartmentService.getUsersInDepartment(departments, departmentName)
    setSelectedUsers(deptUsers.map(user => user.id))
  }

  const handleSaveAssignments = async () => {
    try {
      setSaving(true)
      
      if (assignmentMode === 'department' && selectedDepartment) {
        // Use department assignment
        await DepartmentService.assignTaskToDepartment(task.id, selectedDepartment)
        toast.success(`Task assigned to ${selectedDepartment} department`)
      } else {
        // Use individual assignment
        await onAssignmentUpdate(task.id, selectedUsers)
        toast.success('Task assignments updated successfully')
      }
      
      onClose()
    } catch (error) {
      console.error('Error updating assignments:', error)
      toast.error('Failed to update assignments')
    } finally {
      setSaving(false)
    }
  }

  const getCurrentAssignmentSummary = () => {
    const currentUsers = users.filter(user => selectedUsers.includes(user.id))
    const assignedDepartments = new Set()
    
    currentUsers.forEach(user => {
      const userDept = departments.find(dept => 
        dept.users.some(deptUser => deptUser.id === user.id)
      )
      if (userDept) {
        assignedDepartments.add(userDept.name)
      }
    })

    return {
      userCount: currentUsers.length,
      departmentCount: assignedDepartments.size,
      users: currentUsers,
      departments: Array.from(assignedDepartments)
    }
  }

  if (!isAdmin) {
    return null
  }

  const assignmentSummary = getCurrentAssignmentSummary()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Manage Task Assignments</span>
          </DialogTitle>
          <DialogDescription>
            Assign "{task?.title}" to users or departments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignment Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4" />
                  <span>{assignmentSummary.userCount} users assigned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>{assignmentSummary.departmentCount} departments involved</span>
                </div>
              </div>
              
              {assignmentSummary.users.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {assignmentSummary.users.map(user => (
                    <Badge key={user.id} variant="outline" className="text-xs">
                      {user.full_name || user.email}
                      {user.role === 'admin' && ' (Admin)'}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Mode Tabs */}
          <Tabs value={assignmentMode} onValueChange={(value) => setAssignmentMode(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4" />
                <span>Individual Users</span>
              </TabsTrigger>
              <TabsTrigger value="department" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Departments</span>
              </TabsTrigger>
            </TabsList>

            {/* Individual User Assignment */}
            <TabsContent value="individual" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Users</Label>
                {loadingUsers ? (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-muted rounded">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          className="rounded"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.full_name || user.email}</span>
                            {user.role && (
                              <span className="text-xs text-muted-foreground">{user.role}</span>
                            )}
                          </div>
                          {user.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Department Assignment */}
            <TabsContent value="department" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Department</Label>
                {loadingDepartments ? (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading departments...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {departments.map(department => (
                      <label key={department.name} className="flex items-center space-x-3 cursor-pointer p-3 border rounded-md hover:bg-muted">
                        <input
                          type="radio"
                          name="department"
                          checked={selectedDepartment === department.name}
                          onChange={() => handleDepartmentSelect(department.name)}
                          className="rounded"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">{department.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {department.userCount} user{department.userCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">{department.userCount}</Badge>
                      </label>
                    ))}
                  </div>
                )}
                
                {selectedDepartment && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Department Preview: {selectedDepartment}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {DepartmentService.getUsersInDepartment(departments, selectedDepartment).map(user => (
                          <Badge key={user.id} variant="secondary" className="text-xs">
                            {user.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAssignments} 
              disabled={saving || (assignmentMode === 'individual' && selectedUsers.length === 0)}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {assignmentMode === 'department' ? 'Assign to Department' : 'Update Assignments'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}