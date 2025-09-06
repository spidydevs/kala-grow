import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { checkUserPermission, getUserPrimaryRole } from '@/services/roleService'

export interface RoleVerificationResult {
  hasPermission: boolean
  userRole: string
  loading: boolean
  error: string | null
}

export function useRoleVerification(permission: string): RoleVerificationResult {
  const [hasPermission, setHasPermission] = useState(false)
  const [userRole, setUserRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    async function verifyRole() {
      if (!user || !permission) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Use the new role service
        const [hasPermissionResult, primaryRole] = await Promise.all([
          checkUserPermission(user.id, permission),
          getUserPrimaryRole(user.id)
        ])

        setHasPermission(hasPermissionResult)
        setUserRole(primaryRole)

      } catch (err: any) {
        console.error('Role verification error:', err)
        setError(err.message)
        setHasPermission(false)
        setUserRole('member')
      } finally {
        setLoading(false)
      }
    }

    verifyRole()
  }, [user, permission])

  return { hasPermission, userRole, loading, error }
}

// Specific permission hooks for common use cases
export function useCanManageUsers() {
  return useRoleVerification('can_manage_users')
}

export function useCanAssignTasks() {
  return useRoleVerification('can_assign_tasks')
}

export function useCanViewAllTasks() {
  return useRoleVerification('can_view_all_tasks')
}

export function useCanAccessCRM() {
  return useRoleVerification('can_access_crm')
}

export function useCanAccessFinances() {
  return useRoleVerification('can_access_finances')
}

export function useCanAccessReports() {
  return useRoleVerification('can_access_reports')
}

export function useIsAdmin() {
  const { userRole, loading } = useRoleVerification('can_manage_users')
  return { isAdmin: userRole === 'admin', loading }
}