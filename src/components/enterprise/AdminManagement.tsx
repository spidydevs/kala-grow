import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Award, Settings, BarChart3, Shield } from 'lucide-react'
import { RoleGuard } from './RoleGuard'
import { UserManagement } from '../admin/UserManagement'
import RoleManagementPanel from './RoleManagementPanel'

export function AdminManagement() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <RoleGuard permission="can_manage_users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Admin Management</h2>
            <p className="text-muted-foreground">Manage users, roles, and system permissions</p>
          </div>
          <div>
            <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline">
              <Settings className="h-4 w-4" />
              Open Settings
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-2 h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="mr-2 h-4 w-4" />
              User Analytics
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="mr-2 h-4 w-4" />
              Role Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">User Growth</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12.3%</div>
                  <p className="text-xs text-muted-foreground">
                    User registrations this month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">
                    Users active in last 7 days
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    Administrative actions today
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>User Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics and reporting for user management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced user analytics will be available in this section.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RoleManagementPanel />
          </TabsContent>

        </Tabs>
      </div>
    </RoleGuard>
  )
}
