import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCanAccessCRM, useCanAccessFinances, useCanAccessReports, useIsAdmin } from '@/hooks/useRoleVerification'
import { Shield, Users, BarChart3, DollarSign, FileText, Crown } from 'lucide-react'

export function AdminNavigationTest() {
  const navigate = useNavigate()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const { hasPermission: canAccessCRM, loading: crmLoading } = useCanAccessCRM()
  const { hasPermission: canAccessFinances, loading: financeLoading } = useCanAccessFinances()
  const { hasPermission: canAccessReports, loading: reportsLoading } = useCanAccessReports()

  const adminFeatures = [
    {
      name: 'CRM',
      path: '/crm',
      icon: Users,
      hasPermission: canAccessCRM,
      loading: crmLoading,
      description: 'Customer relationship management'
    },
    {
      name: 'Finances',
      path: '/finance',
      icon: DollarSign,
      hasPermission: canAccessFinances,
      loading: financeLoading,
      description: 'Financial management and invoicing'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
      hasPermission: canAccessReports,
      loading: reportsLoading,
      description: 'Analytics and reporting'
    }
  ]

  const handleNavigate = (path: string, hasPermission: boolean) => {
    if (hasPermission) {
      navigate(path)
    } else {
      alert('Access denied: You do not have permission to access this feature')
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Feature Access Test
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Test access to admin features and navigation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Admin Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            <div>
              <h3 className="font-medium text-foreground">Admin Status</h3>
              <p className="text-sm text-muted-foreground">Overall admin access level</p>
            </div>
          </div>
          
          <div className="text-right">
            {adminLoading ? (
              <div className="animate-pulse bg-muted h-6 w-16 rounded"></div>
            ) : (
              <Badge className={isAdmin ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}>
                {isAdmin ? 'Admin' : 'Member'}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Admin Features */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Admin Features</h3>
          
          {adminFeatures.map((feature) => {
            const Icon = feature.icon
            
            return (
              <div key={feature.name} className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-foreground">{feature.name}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {feature.loading ? (
                    <div className="animate-pulse bg-muted h-6 w-16 rounded"></div>
                  ) : (
                    <Badge className={feature.hasPermission ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}>
                      {feature.hasPermission ? 'Allowed' : 'Denied'}
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => handleNavigate(feature.path, feature.hasPermission)}
                    variant={feature.hasPermission ? 'default' : 'outline'}
                    disabled={feature.loading}
                    className={feature.hasPermission ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-border text-muted-foreground hover:bg-muted'}
                  >
                    {feature.loading ? 'Loading...' : 'Test Access'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Summary */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
          <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Expected Behavior</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Admin users should see all features as "Allowed"</li>
            <li>• "Test Access" buttons should navigate to respective pages</li>
            <li>• Member users should see "Denied" for admin features</li>
            <li>• Access denied alert should show for restricted features</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}