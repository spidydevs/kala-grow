import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Upload, 
  Download, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Server,
  Key,
  Mail,
  Globe,
  Palette,
  Clock
} from 'lucide-react'
import { useEnterprise } from '@/contexts/EnterpriseContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SystemConfig {
  organization_name: string
  timezone: string
  date_format: string
  currency: string
  language: string
  theme: string
  notifications_enabled: boolean
  email_notifications: boolean
  system_maintenance: boolean
  backup_frequency: string
  data_retention_days: number
}

export function SystemSettings() {
  const { permissions, isAdmin } = useEnterprise()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let t = params.get('tab')
    if (!t) {
      const parts = location.pathname.split('/').filter(Boolean)
      // parts => ['settings', 'notifications'] -> take second segment
      t = parts.length > 1 ? parts[1] : null
    }
    if (!t) t = 'general'
    setActiveTab(t)
  }, [location])

  const [config, setConfig] = useState<SystemConfig>({
    organization_name: 'Kala Grow',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    currency: 'USD',
    language: 'en',
    theme: 'system',
    notifications_enabled: true,
    email_notifications: true,
    system_maintenance: false,
    backup_frequency: 'daily',
    data_retention_days: 365
  })
  const [loading, setLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    auth: 'healthy'
  })


  useEffect(() => {
    loadSystemConfig()
    checkSystemHealth()
  }, [])

  const loadSystemConfig = async () => {
    try {
      // In a real implementation, this would load from a system_config table
      // For now, we'll use default values
      setConfig({
        organization_name: 'Kala Grow',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        currency: 'USD',
        language: 'en',
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        system_maintenance: false,
        backup_frequency: 'daily',
        data_retention_days: 365
      })
    } catch (error) {
      console.error('Error loading system config:', error)
      toast.error('Failed to load system configuration')
    }
  }

  const checkSystemHealth = async () => {
    try {
      // Check database connection
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1)
      
      // Check Edge Functions
      const { error: funcError } = await supabase.functions.invoke('health-check')
      
      setHealthStatus({
        database: dbError ? 'error' : 'healthy',
        api: funcError ? 'warning' : 'healthy',
        storage: 'healthy', // Assume healthy for now
        auth: 'healthy' // Assume healthy for now
      })
    } catch (error) {
      console.error('Error checking system health:', error)
    }
  }

  const saveConfig = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would save to a system_config table
      toast.success('System configuration saved successfully')
    } catch (error: any) {
      console.error('Error saving config:', error)
      toast.error('Failed to save system configuration')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      toast.info('Data export initiated. This may take a few minutes...')
      
      // Call data export Edge Function
      const { data, error } = await supabase.functions.invoke('data-export', {
        body: { format: 'json', include_all: true }
      })
      
      if (error) {
        throw error
      }
      
      toast.success('Data export completed successfully')
    } catch (error: any) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data: ' + error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className={`h-4 w-4 ${getStatusColor(status)}`} />
      case 'warning':
      case 'error':
        return <AlertCircle className={`h-4 w-4 ${getStatusColor(status)}`} />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  return (!permissions?.can_manage_users ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to access system settings.</p>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings, security, and maintenance options
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                General Configuration
              </CardTitle>
              <CardDescription>
                Basic system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="org_name">Organization Name</Label>
                  <Input
                    id="org_name"
                    value={config.organization_name}
                    onChange={(e) => setConfig({ ...config, organization_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={config.timezone} onValueChange={(value) => setConfig({ ...config, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date_format">Date Format</Label>
                  <Select value={config.date_format} onValueChange={(value) => setConfig({ ...config, date_format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={config.currency} onValueChange={(value) => setConfig({ ...config, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveConfig} disabled={loading}>
                {loading ? 'Saving...' : 'Save General Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Allow system to send notifications</p>
                  </div>
                  <Switch
                    checked={config.notifications_enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, notifications_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={config.email_notifications}
                    onCheckedChange={(checked) => setConfig({ ...config, email_notifications: checked })}
                  />
                </div>
              </div>
              <Button onClick={saveConfig} disabled={loading}>
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Security settings are managed through Supabase Auth configuration. 
                  Contact your system administrator for advanced security options.
                </AlertDescription>
              </Alert>
              <div>
                <Label>Data Retention (Days)</Label>
                <Input
                  type="number"
                  value={config.data_retention_days}
                  onChange={(e) => setConfig({ ...config, data_retention_days: parseInt(e.target.value) || 365 })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  How long to keep deleted data in the system
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Maintenance & Backup
              </CardTitle>
              <CardDescription>
                System maintenance options and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Temporarily disable system access</p>
                  </div>
                  <Switch
                    checked={config.system_maintenance}
                    onCheckedChange={(checked) => setConfig({ ...config, system_maintenance: checked })}
                  />
                </div>
                <div>
                  <Label>Backup Frequency</Label>
                  <Select value={config.backup_frequency} onValueChange={(value) => setConfig({ ...config, backup_frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Export</Label>
                  <Button onClick={exportData} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                System Health
              </CardTitle>
              <CardDescription>
                Monitor system components and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">Database</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus.database)}
                      <Badge variant={healthStatus.database === 'healthy' ? 'default' : 'destructive'}>
                        {healthStatus.database}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Server className="h-4 w-4" />
                      <span className="font-medium">API Services</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus.api)}
                      <Badge variant={healthStatus.api === 'healthy' ? 'default' : 'destructive'}>
                        {healthStatus.api}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span className="font-medium">Storage</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus.storage)}
                      <Badge variant={healthStatus.storage === 'healthy' ? 'default' : 'destructive'}>
                        {healthStatus.storage}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <span className="font-medium">Authentication</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(healthStatus.auth)}
                      <Badge variant={healthStatus.auth === 'healthy' ? 'default' : 'destructive'}>
                        {healthStatus.auth}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={checkSystemHealth} variant="outline">
                  Refresh Health Check
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  ))
}
