import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import NotificationService, { NotificationPreferences } from '@/services/notificationService'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Clock,
  Settings,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react'

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient()
  const [preferences, setPreferences] = useState<Partial<NotificationPreferences>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Query for current preferences
  const {
    data: currentPreferences,
    isLoading,
    error
  } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => NotificationService.getPreferences()
  })

  // Update local state when data loads
  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences)
      setHasChanges(false)
    }
  }, [currentPreferences])

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: Partial<NotificationPreferences>) => 
      NotificationService.updatePreferences(newPreferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      setHasChanges(false)
      toast.success('Notification preferences updated successfully')
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error)
      toast.error('Failed to update notification preferences')
    }
  })

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences)
  }

  const handleReset = () => {
    if (currentPreferences) {
      setPreferences(currentPreferences)
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Failed to load notification preferences
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Customize how and when you receive notifications
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>General Settings</span>
            </CardTitle>
            <CardDescription>
              Control your overall notification experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Do Not Disturb</Label>
                <p className="text-sm text-muted-foreground">
                  Disable all notifications temporarily
                </p>
              </div>
              <Switch
                checked={preferences.do_not_disturb || false}
                onCheckedChange={(checked) => handlePreferenceChange('do_not_disturb', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Set specific hours when you don't want to receive notifications
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Select
                    value={preferences.quiet_hours_start || ''}
                    onValueChange={(value) => handlePreferenceChange('quiet_hours_start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = String(i).padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Select
                    value={preferences.quiet_hours_end || ''}
                    onValueChange={(value) => handlePreferenceChange('quiet_hours_end', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = String(i).padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Types</span>
            </CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Task Assignments</Label>
                  <p className="text-sm text-muted-foreground">
                    When tasks are assigned to you
                  </p>
                </div>
                <Switch
                  checked={preferences.task_assignments ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('task_assignments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Task Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    When tasks you're involved in are updated
                  </p>
                </div>
                <Switch
                  checked={preferences.task_updates ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('task_updates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Task Completions</Label>
                  <p className="text-sm text-muted-foreground">
                    When tasks you created or assigned are completed
                  </p>
                </div>
                <Switch
                  checked={preferences.task_completions ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('task_completions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Department Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    When tasks are assigned to your department
                  </p>
                </div>
                <Switch
                  checked={preferences.department_notifications ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('department_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important system updates and maintenance notices
                  </p>
                </div>
                <Switch
                  checked={preferences.system_alerts ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('system_alerts', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Delivery Methods</span>
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>In-App Notifications</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the application
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications ?? true}
                onCheckedChange={(checked) => handlePreferenceChange('push_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Notifications</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to your email address
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications ?? false}
                onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">You have unsaved changes</span>
                  </div>
                )}
                {!hasChanges && !updatePreferencesMutation.isPending && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">All changes saved</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || updatePreferencesMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NotificationPreferencesPage