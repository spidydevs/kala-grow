import React, { ReactNode } from 'react'
import { useEnterprise } from '@/contexts/EnterpriseContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  permission?: string
  role?: 'admin' | 'member'
  fallback?: ReactNode
  showError?: boolean
}

export function RoleGuard({ 
  children, 
  permission, 
  role, 
  fallback,
  showError = true 
}: RoleGuardProps) {
  const { permissions, currentUser, loading } = useEnterprise()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!currentUser) {
    return fallback || (
      showError ? (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Authentication required to access this feature.
          </AlertDescription>
        </Alert>
      ) : null
    )
  }

  // Check permission-based access
  if (permission && !permissions[permission]) {
    return fallback || (
      showError ? (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      ) : null
    )
  }

  // Check role-based access
  if (role && currentUser.role !== role) {
    return fallback || (
      showError ? (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            This feature is restricted to {role} users only.
          </AlertDescription>
        </Alert>
      ) : null
    )
  }

  return <>{children}</>
}