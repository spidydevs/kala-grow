import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  Target,
  Trophy,
  Calendar,
  BarChart3,
  Download,
  Award
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import RevenueService, {
  formatCurrency,
  calculateProgress,
  getTargetStatus,
  UserRevenue,
  RevenueTarget
} from '@/services/revenueService'
import { RevenueTable } from '@/components/revenue/RevenueTable'
import { exportRevenueToCSV, exportRevenueSummaryToCSV } from '@/utils/exportRevenue'
import { toast } from 'sonner'
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
  Bar
} from 'recharts'

export function MyRevenueView() {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'targets'>('overview')

  // Queries for user's own data
  const { data: revenueSummary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['my-revenue-summary', selectedPeriod],
    queryFn: () => RevenueService.getRevenueSummary({
      user_id: user?.id,
      period: selectedPeriod
    } as any),
    enabled: !!user?.id
  })

  const { data: targets, isLoading: loadingTargets, refetch: refetchTargets } = useQuery({
    queryKey: ['my-revenue-targets'],
    queryFn: () => RevenueService.getRevenueTargets(user?.id),
    enabled: !!user?.id
  })

  const { data: revenueData, isLoading: loadingRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ['my-revenue-data'],
    queryFn: () => RevenueService.getRevenue({
      user_id: user?.id,
      limit: 100
    } as any),
    enabled: !!user?.id
  })

  const handleExport = (format: 'csv' | 'summary') => {
    if (!revenueData?.revenue || revenueData.revenue.length === 0) {
      toast.error('No revenue data to export')
      return
    }

    try {
      if (format === 'csv') {
        exportRevenueToCSV(revenueData.revenue, 'my-revenue-data')
        toast.success('Revenue data exported successfully')
      } else {
        exportRevenueSummaryToCSV(revenueData.revenue, 'my-revenue-summary')
        toast.success('Revenue summary exported successfully')
      }
    } catch (error) {
      toast.error('Failed to export revenue data')
    }
  }

  // Calculate revenue metrics
  const revenueMetrics = revenueSummary?.totals || {
    total_revenue: 0,
    sales_revenue: 0,
    commission_revenue: 0,
    bonus_revenue: 0,
    project_revenue: 0,
    transaction_count: 0
  }

  // Get current month target
  const currentMonthTarget = targets?.find(t => {
    const now = new Date()
    const targetStart = new Date(t.period_start)
    const targetEnd = new Date(t.period_end)
    return targetStart <= now && now <= targetEnd && t.target_period === 'monthly'
  })

  const targetProgress = currentMonthTarget
    ? calculateProgress(currentMonthTarget.achievement_amount, currentMonthTarget.target_amount)
    : 0

  const targetStatus = currentMonthTarget ? getTargetStatus(currentMonthTarget) : null

  // Prepare chart data
  const chartData = revenueSummary?.summaries?.map(summary => ({
    period: summary.period_start,
    total: summary.total_revenue,
    sales: summary.sales_revenue,
    commission: summary.commission_revenue,
    bonus: summary.bonus_revenue,
    project: summary.project_revenue
  })) || []

  if (loadingSummary || loadingTargets || loadingRevenue) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Revenue</h1>
          <p className="text-muted-foreground">
            Track your personal revenue performance and targets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics.total_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueMetrics.transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics.commission_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Performance earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics.bonus_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Achievement bonuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(targetProgress)}%
            </div>
            <div className="mt-1">
              <Progress value={targetProgress} className="h-2" />
            </div>
            {targetStatus && (
              <p className={`text-xs mt-1 ${targetStatus.color}`}>
                {targetStatus.status}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Revenue Details</TabsTrigger>
          <TabsTrigger value="targets">My Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Your revenue performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>
                Revenue by type for current period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sales Revenue</span>
                  <span className="font-medium">{formatCurrency(revenueMetrics.sales_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Commission</span>
                  <span className="font-medium">{formatCurrency(revenueMetrics.commission_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bonus</span>
                  <span className="font-medium">{formatCurrency(revenueMetrics.bonus_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Project Revenue</span>
                  <span className="font-medium">{formatCurrency(revenueMetrics.project_revenue)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between font-bold">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(revenueMetrics.total_revenue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <div className="space-y-4">
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={() => handleExport('summary')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            </div>
            {revenueData && (
              <RevenueTable
                revenue={revenueData.revenue}
                // No edit/delete for regular users
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="targets">
          <div className="grid gap-4">
            {targets && targets.length > 0 ? (
              targets.map(target => {
                const progress = calculateProgress(target.achievement_amount, target.target_amount)
                const status = getTargetStatus(target)
                
                return (
                  <Card key={target.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>
                              {target.target_period.charAt(0).toUpperCase() + target.target_period.slice(1)} Target
                            </span>
                            <Badge variant="outline" className={status.color}>
                              {status.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {target.period_start} to {target.period_end}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {formatCurrency(target.target_amount)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Target Amount
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Progress: {formatCurrency(target.achievement_amount)}
                          </span>
                          <span className="text-sm font-medium">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                          {status.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No targets set</h3>
                    <p className="text-sm">
                      Contact your admin to set revenue targets
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
