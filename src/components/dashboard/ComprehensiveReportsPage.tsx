import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Download,
  RefreshCw,
  Calendar,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  Bell,
  Activity,
  BarChart3,
  PieChart,
  AlertTriangle,
  Award
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useComprehensiveAnalytics, useAllUsers, DateRange } from '@/hooks/useComprehensiveAnalytics'
import { useAuth } from '@/contexts/AuthContext'
import { useEnterprise } from '@/contexts/EnterpriseContext'
import { DateRangePicker } from './DateRangePicker'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'
import { format } from 'date-fns'
import { toast } from 'sonner'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280']

export function ComprehensiveReportsPage() {
  const { user } = useAuth()
  const { isAdmin, currentUser } = useEnterprise()
  
  // Set default date range to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  })
  
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tasks' | 'revenue' | 'performance' | 'notifications'>('overview')
  
  // Get comprehensive analytics data
  const { data, isLoading, error, refetch } = useComprehensiveAnalytics(
    dateRange,
    isAdmin && selectedUserId !== 'all' ? selectedUserId : undefined
  )

  // Get all users for admin dropdown
  const { data: users, isLoading: usersLoading } = useAllUsers()

  const handleExportCSV = () => {
    if (!data) return
    
    try {
      // Create CSV content from analytics data
      const csvContent = [
        ['Metric', 'Value'],
        ['Period', `${format(dateRange.startDate, 'MMM dd, yyyy')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`],
        [''],
        ['TASK ANALYTICS', ''],
        ['Total Tasks', data.analytics.tasks.total.toString()],
        ['Completed Tasks', data.analytics.tasks.completed.toString()],
        ['Completion Rate', `${data.analytics.tasks.completion_rate}%`],
        ['Total Points', data.analytics.tasks.total_points.toString()],
        ['Average Completion Time', `${data.analytics.tasks.average_completion_time} days`],
        [''],
        ['REVENUE ANALYTICS', ''],
        ['Total Revenue', `$${data.analytics.revenue.total.toLocaleString()}`],
        ['Sales Revenue', `$${data.analytics.revenue.sales.toLocaleString()}`],
        ['Commission Revenue', `$${data.analytics.revenue.commission.toLocaleString()}`],
        ['Total Transactions', data.analytics.revenue.transaction_count.toString()],
        ['Average Deal Size', `$${data.analytics.revenue.average_deal_size.toFixed(2)}`],
        [''],
        ['PERFORMANCE METRICS', ''],
        ['Productivity Score', data.analytics.performance.productivity_score.toString()],
        ['Total Points', data.analytics.performance.total_points.toString()],
        ['Achievements', data.analytics.performance.achievements_count.toString()],
        ['Activity Score', data.analytics.performance.activity_score.toString()],
        [''],
        ['TIME ANALYTICS', ''],
        ['Active Days', data.analytics.time.active_days.toString()],
        ['Most Productive Day', data.analytics.time.most_productive_day],
        ['Most Productive Hour', `${data.analytics.time.most_productive_hour}:00`]
      ].map(row => row.join(',')).join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprehensive-report-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  const handleExportPDF = () => {
    toast.info('PDF export feature coming soon')
    window.print()
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics data: {error.message}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => refetch()} 
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comprehensive Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights from tasks, revenue, performance, and system data
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            size="sm"
            disabled={isLoading || !data}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={handleExportPDF} 
            variant="outline" 
            size="sm"
            disabled={isLoading || !data}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateRangePicker 
              dateRange={dateRange} 
              onChange={setDateRange}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
        
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={usersLoading ? "Loading users..." : "All Users"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users?.users?.filter(user => user.id && user.full_name && user.id.trim() !== '').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {users && (
                <p className="text-xs text-muted-foreground mt-2">
                  {users?.users?.length || 0} users available
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading comprehensive analytics...</span>
        </div>
      )}

      {/* Analytics Content */}
      {data && (
        <>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.analytics.tasks.total.toLocaleString()}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Progress value={data.analytics.tasks.completion_rate} className="flex-1 h-2" />
                  <span>{data.analytics.tasks.completion_rate}% completed</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data.analytics.revenue.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {data.analytics.revenue.transaction_count} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.analytics.performance.productivity_score}</div>
                <p className="text-xs text-muted-foreground">
                  {data.analytics.performance.total_points.toLocaleString()} total points
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Days</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.analytics.time.active_days}</div>
                <p className="text-xs text-muted-foreground">
                  Most productive: {data.analytics.time.most_productive_day}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Tabs */}
          <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Task Completion Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Completion Trend</CardTitle>
                    <CardDescription>
                      Daily task creation and completion over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.task_completion_trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          />
                          <Area
                            type="monotone"
                            dataKey="created"
                            stackId="1"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.3}
                            name="Created"
                          />
                          <Area
                            type="monotone"
                            dataKey="completed"
                            stackId="2"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.8}
                            name="Completed"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>
                      Daily revenue and transaction volume
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.charts.revenue_trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                            formatter={(value: any, name) => {
                              if (name === 'revenue') {
                                return [`$${value.toLocaleString()}`, 'Revenue']
                              }
                              return [value, name]
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                            name="revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              {data.insights && data.insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                    <CardDescription>
                      AI-powered insights from your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.insights.map((insight, index) => (
                        <div 
                          key={index} 
                          className="flex items-start space-x-3 p-4 border rounded-lg"
                        >
                          <div className={`p-2 rounded-full ${
                            insight.type === 'success' ? 'bg-green-100 text-green-600' :
                            insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            insight.type === 'error' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {insight.type === 'success' && <CheckCircle className="h-4 w-4" />}
                            {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                            {insight.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                            {insight.type === 'info' && <TrendingUp className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{insight.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {insight.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-green-600">
                          {data.analytics.tasks.completed}
                        </div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {data.analytics.tasks.in_progress}
                        </div>
                        <div className="text-sm text-muted-foreground">In Progress</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {data.analytics.tasks.todo}
                        </div>
                        <div className="text-sm text-muted-foreground">To Do</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {data.analytics.tasks.total_points}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Completion Rate</span>
                        <span className="text-sm">{data.analytics.tasks.completion_rate}%</span>
                      </div>
                      <Progress value={data.analytics.tasks.completion_rate} className="h-2" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average Completion Time</span>
                        <span className="text-sm font-medium">
                          {data.analytics.tasks.average_completion_time} days
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ${data.analytics.revenue.sales.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ${data.analytics.revenue.commission.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Average Deal Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      ${data.analytics.revenue.average_deal_size.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Productivity Score</span>
                        <span className="text-lg font-bold">
                          {data.analytics.performance.productivity_score}
                        </span>
                      </div>
                      <Progress value={data.analytics.performance.productivity_score} className="h-3" />
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <div className="text-lg font-bold">
                            {data.analytics.performance.achievements_count}
                          </div>
                          <div className="text-sm text-muted-foreground">Achievements</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">
                            {data.analytics.performance.activity_score}
                          </div>
                          <div className="text-sm text-muted-foreground">Activity Score</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Time Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Most Productive Day</span>
                        <span className="text-sm font-medium">
                          {data.analytics.time.most_productive_day}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Most Productive Hour</span>
                        <span className="text-sm font-medium">
                          {data.analytics.time.most_productive_hour}:00
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.analytics.notifications.total}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Read Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {data.analytics.notifications.engagement_rate}%
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Unread</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {data.analytics.notifications.unread}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

export default ComprehensiveReportsPage