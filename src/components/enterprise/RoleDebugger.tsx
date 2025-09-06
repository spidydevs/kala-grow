import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { checkUserPermission, getUserPrimaryRole, getUserRoleAssignments } from '@/services/roleService'
import { useIsAdmin, useCanAccessCRM, useCanAccessFinances, useCanAccessReports } from '@/hooks/useRoleVerification'
import { supabase } from '@/lib/supabase'
import { Shield, User, Database, Network, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DebugResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  data?: any
}

export function RoleDebugger() {
  const [debugResults, setDebugResults] = useState<DebugResult[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  // Use role verification hooks
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const { hasPermission: canAccessCRM, loading: crmLoading } = useCanAccessCRM()
  const { hasPermission: canAccessFinances, loading: financeLoading } = useCanAccessFinances()
  const { hasPermission: canAccessReports, loading: reportsLoading } = useCanAccessReports()
  
  const runDiagnostics = async () => {
    if (!user) return
    
    setLoading(true)
    const results: DebugResult[] = []
    
    try {
      // Test 1: User Authentication
      results.push({
        test: 'User Authentication',
        status: user ? 'success' : 'error',
        message: user ? `Authenticated as ${user.id}` : 'No authenticated user',
        data: { userId: user?.id, email: user?.email }
      })
      
      // Test 2: Check if user is admin
      results.push({
        test: 'Admin Status Check',
        status: user.id === '41b26b73-c433-4136-81eb-28c66e4b507a' ? 'success' : 'warning',
        message: user.id === '41b26b73-c433-4136-81eb-28c66e4b507a' ? 'User is the known admin user' : 'User is not the known admin user',
        data: { isKnownAdmin: user.id === '41b26b73-c433-4136-81eb-28c66e4b507a' }
      })
      
      // Test 3: Direct role assignments query
      try {
        const roleAssignments = await getUserRoleAssignments(user.id)
        results.push({
          test: 'Role Assignments Query',
          status: roleAssignments.length > 0 ? 'success' : 'warning',
          message: `Found ${roleAssignments.length} role assignments`,
          data: roleAssignments
        })
      } catch (error: any) {
        results.push({
          test: 'Role Assignments Query',
          status: 'error',
          message: `Failed to fetch role assignments: ${error.message}`,
          data: { error: error.message }
        })
      }
      
      // Test 4: Primary role check
      try {
        const primaryRole = await getUserPrimaryRole(user.id)
        results.push({
          test: 'Primary Role',
          status: primaryRole === 'admin' ? 'success' : 'warning',
          message: `Primary role is: ${primaryRole}`,
          data: { primaryRole }
        })
      } catch (error: any) {
        results.push({
          test: 'Primary Role',
          status: 'error',
          message: `Failed to get primary role: ${error.message}`,
          data: { error: error.message }
        })
      }
      
      // Test 5: Permission checks
      const permissions = ['can_manage_users', 'can_access_crm', 'can_access_finances', 'can_access_reports']
      for (const permission of permissions) {
        try {
          const hasPermission = await checkUserPermission(user.id, permission)
          results.push({
            test: `Permission: ${permission}`,
            status: hasPermission ? 'success' : 'warning',
            message: hasPermission ? 'Permission granted' : 'Permission denied',
            data: { permission, hasPermission }
          })
        } catch (error: any) {
          results.push({
            test: `Permission: ${permission}`,
            status: 'error',
            message: `Error checking permission: ${error.message}`,
            data: { permission, error: error.message }
          })
        }
      }
      
      // Test 6: Direct database queries
      try {
        const { data: assignments, error } = await supabase
          .from('user_role_assignments')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        
        results.push({
          test: 'Direct DB Query (Assignments)',
          status: error ? 'error' : 'success',
          message: error ? `DB Error: ${error.message}` : `Found ${assignments?.length || 0} assignments`,
          data: { assignments, error }
        })
      } catch (error: any) {
        results.push({
          test: 'Direct DB Query (Assignments)',
          status: 'error',
          message: `Query failed: ${error.message}`,
          data: { error: error.message }
        })
      }
      
      // Test 7: Profile query
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        results.push({
          test: 'Profile Query',
          status: error ? 'error' : (profile ? 'success' : 'warning'),
          message: error ? `Profile Error: ${error.message}` : (profile ? 'Profile found' : 'No profile found'),
          data: { profile, error }
        })
      } catch (error: any) {
        results.push({
          test: 'Profile Query',
          status: 'error',
          message: `Profile query failed: ${error.message}`,
          data: { error: error.message }
        })
      }
      
    } catch (error: any) {
      results.push({
        test: 'Overall Diagnostics',
        status: 'error',
        message: `Diagnostics failed: ${error.message}`,
        data: { error: error.message }
      })
    }
    
    setDebugResults(results)
    setLoading(false)
  }
  
  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }
  
  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-600'
      case 'warning':
        return 'bg-yellow-600'
    }
  }
  
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role & Permission Debugger
        </CardTitle>
        <CardDescription className="text-gray-400">
          Comprehensive role verification and permission testing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-800 rounded border border-gray-700">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-300">Admin Status</span>
            </div>
            <div className="mt-1">
              {adminLoading ? (
                <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
              ) : (
                <Badge className={isAdmin ? 'bg-green-600' : 'bg-gray-600'}>
                  {isAdmin ? 'Admin' : 'Member'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-gray-800 rounded border border-gray-700">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-300">CRM Access</span>
            </div>
            <div className="mt-1">
              {crmLoading ? (
                <div className="animate-pulse bg-gray-600 h-4 w-12 rounded"></div>
              ) : (
                <Badge className={canAccessCRM ? 'bg-green-600' : 'bg-red-600'}>
                  {canAccessCRM ? 'Yes' : 'No'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-gray-800 rounded border border-gray-700">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Finance Access</span>
            </div>
            <div className="mt-1">
              {financeLoading ? (
                <div className="animate-pulse bg-gray-600 h-4 w-12 rounded"></div>
              ) : (
                <Badge className={canAccessFinances ? 'bg-green-600' : 'bg-red-600'}>
                  {canAccessFinances ? 'Yes' : 'No'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-gray-800 rounded border border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Report Access</span>
            </div>
            <div className="mt-1">
              {reportsLoading ? (
                <div className="animate-pulse bg-gray-600 h-4 w-12 rounded"></div>
              ) : (
                <Badge className={canAccessReports ? 'bg-green-600' : 'bg-red-600'}>
                  {canAccessReports ? 'Yes' : 'No'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Run Diagnostics Button */}
        <Button 
          onClick={runDiagnostics} 
          disabled={loading || !user}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Running Diagnostics...' : 'Run Complete Diagnostics'}
        </Button>
        
        {/* Detailed Results */}
        {debugResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">Diagnostic Results</h3>
            
            {debugResults.map((result, index) => (
              <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-white">{result.test}</span>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-300 mt-1">{result.message}</p>
                
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                      View Details
                    </summary>
                    <pre className="text-xs text-gray-400 mt-1 p-2 bg-gray-900 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}