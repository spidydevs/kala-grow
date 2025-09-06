import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useFinancialSummary } from '@/services/financeService'
import { useUserActivities } from '@/services/gamificationService'
import { useTasks } from '@/services/taskService'
import { useUnifiedMetrics } from '@/services/unifiedMetricsService'
import { formatCurrency, formatRelativeTime, getActivityIcon, formatActivityMessage } from '@/services'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FocusTimer } from '@/components/FocusTimer'

import { toast } from 'sonner'
import {
  BarChart3,
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  Target,
  TrendingUp,
  Award,
  Zap,
  Plus,
  ArrowRight,
  Calendar,
  Activity,
  Settings
} from 'lucide-react'

export function DashboardPage() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  
  // Settings action
  const handleSettingsOpen = () => {
    navigate('/settings')
  }
  
  // Use unified metrics service for consistent data across all dashboard components
  const { data: unifiedMetrics, isLoading: loadingMetrics, error: metricsError } = useUnifiedMetrics()
  const { data: financialSummary, isLoading: loadingFinance, error: financeError } = useFinancialSummary({ period: 'month' })
  const { data: recentTasks } = useTasks({ limit: 5, status: 'completed' })
  const { data: activities, isLoading: loadingActivities, error: activitiesError } = useUserActivities({ limit: 5 })
  
  const isLoading = loadingMetrics || loadingFinance || loadingActivities
  const hasErrors = metricsError || financeError || activitiesError

  // Use unified metrics with safe fallbacks
  const metrics = unifiedMetrics || {
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    totalPoints: 0,
    currentLevel: 1,
    currentRank: 'Recruit',
    totalFocusTime: 0,
    focusTimeToday: 0,
    currentStreak: 0,
    totalRevenue: 0,
    teamActivity: []
  }

  // Transform unified metrics to match existing analytics interface
  const analytics = {
    data: {
      total_completed_tasks: metrics.completedTasks,
      weekly_growth: 0, // TODO: Calculate from historical data
      total_focus_time: Math.round(metrics.totalFocusTime / 60), // Convert to hours
      productivity_score: Math.min(metrics.completionRate, 100),
      daily_completed_tasks: metrics.completedTasks, // Simplified for now
      daily_task_goal: 10,
      daily_focus_time: Math.round(metrics.focusTimeToday / 60),
      daily_focus_goal: 8
    }
  }

  const fallbackFinance = { data: { total_revenue: metrics.totalRevenue || 0 } }
  const fallbackActivities = []

  // Use fallback data when APIs fail
  const safeFinancialSummary = financeError ? fallbackFinance : financialSummary
  const safeAnalytics = analytics // Already using unified metrics with fallbacks
  const safeActivities = activitiesError ? fallbackActivities : (activities || [])

  // Event handlers for buttons
  const handleNewTask = () => {
    navigate('/tasks?action=create')
    toast.success('Opening task creation...')
  }

  const handleStartFocusTimer = () => {
    // Focus timer is now handled by the FocusTimer component
    // This button will be replaced by the FocusTimer component
    toast.success('Focus timer available in the sidebar!')
  }

  const handleViewReports = () => {
    navigate('/reports')
    toast.success('Opening reports...')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">
            Welcome back, {profile?.full_name || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your productivity dashboard for today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNewTask} className="btn-taskade-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="card-taskade">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-accent rounded mb-2"></div>
                  <div className="h-8 bg-accent rounded mb-1"></div>
                  <div className="h-3 bg-accent rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-taskade">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {(safeFinancialSummary as any)?.total_revenue ? formatCurrency((safeFinancialSummary as any).total_revenue) : '$0'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">{financeError ? 'Service offline' : 'This month'}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-taskade">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold">{metrics.completedTasks}</p>
                  <p className="text-xs text-green-600 mt-1">{metricsError ? 'Service offline' : `${metrics.completionRate.toFixed(1)}% completion rate`}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-taskade">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Focus Time</p>
                  <p className="text-2xl font-bold">{Math.round(metrics.totalFocusTime / 60)}h</p>
                  <p className="text-xs text-green-600 mt-1">{metricsError ? 'Service offline' : `${Math.round(metrics.focusTimeToday / 60)}h today`}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-taskade">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Points & Level</p>
                  <p className="text-2xl font-bold">{metrics.totalPoints}</p>
                  <p className="text-xs text-green-600 mt-1">{metricsError ? 'Service offline' : `Level ${metrics.currentLevel} - ${metrics.currentRank || 'Recruit'}`}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="card-taskade lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Your latest productivity activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivities ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg bg-accent/50">
                    <div className="h-4 bg-accent rounded mb-2"></div>
                    <div className="h-3 bg-accent rounded w-32"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {safeActivities && safeActivities.length > 0 ? (
                  safeActivities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-accent/50">
                      <div className="text-lg">{getActivityIcon(activity.action)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatActivityMessage(activity)}</p>
                        <p className="text-xs text-muted-foreground">{activity.details?.entity_type}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{activitiesError ? 'Activities service offline' : 'No recent activity'}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Focus Timer */}
        <div className="space-y-6">
          <Card className="card-taskade">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Fast access to common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleNewTask} variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create New Task
              </Button>
              <Button onClick={handleViewReports} variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          {/* Focus Timer */}
          <FocusTimer />
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="card-taskade">
        <CardHeader>
          <CardTitle>Today's Progress</CardTitle>
          <CardDescription>
            Track your daily productivity goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Tasks Completed</span>
                <span>{safeAnalytics?.data?.daily_completed_tasks || 0}/{safeAnalytics?.data?.daily_task_goal || 10}</span>
              </div>
              <Progress 
                value={((safeAnalytics?.data?.daily_completed_tasks || 0) / (safeAnalytics?.data?.daily_task_goal || 10)) * 100} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Focus Time</span>
                <span>{safeAnalytics?.data?.daily_focus_time || 0}/{safeAnalytics?.data?.daily_focus_goal || 8}h</span>
              </div>
              <Progress 
                value={((safeAnalytics?.data?.daily_focus_time || 0) / (safeAnalytics?.data?.daily_focus_goal || 8)) * 100} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Daily Goal</span>
                <span>{safeAnalytics?.data?.productivity_score || 0}%</span>
              </div>
              <Progress value={safeAnalytics?.data?.productivity_score || 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  )
}
