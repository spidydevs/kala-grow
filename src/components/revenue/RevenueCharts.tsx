import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LegacyRevenueAnalytics, formatCurrency } from '@/services/revenueService'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280']

interface RevenueChartsProps {
  analytics: LegacyRevenueAnalytics
}

export function RevenueCharts({ analytics }: RevenueChartsProps) {
  // Prepare data for different chart types
  const periodData = analytics.period_data.map(period => ({
    ...period,
    period_label: period.period.length === 7 ? 
      new Date(period.period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) :
      period.period
  }))

  const revenueTypeData = [
    { name: 'Sales', value: analytics.overall_metrics.total_revenue * 0.4, color: COLORS[0] },
    { name: 'Commission', value: analytics.overall_metrics.total_revenue * 0.25, color: COLORS[1] },
    { name: 'Bonus', value: analytics.overall_metrics.total_revenue * 0.15, color: COLORS[2] },
    { name: 'Project', value: analytics.overall_metrics.total_revenue * 0.2, color: COLORS[3] }
  ].filter(item => item.value > 0)

  const topPerformers = analytics.user_performance.slice(0, 10)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Revenue Trend Over Time */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend Over Time</CardTitle>
          <CardDescription>
            Historical revenue performance by period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period_label" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total_revenue"
                  stackId="1"
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                  fillOpacity={0.3}
                  name="Total Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="sales_revenue"
                  stackId="2"
                  stroke={COLORS[1]}
                  fill={COLORS[1]}
                  fillOpacity={0.3}
                  name="Sales Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="commission_revenue"
                  stackId="3"
                  stroke={COLORS[2]}
                  fill={COLORS[2]}
                  fillOpacity={0.3}
                  name="Commission"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Distribution</CardTitle>
          <CardDescription>
            Breakdown by revenue type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  dataKey="value"
                  data={revenueTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${((entry.value / analytics.overall_metrics.total_revenue) * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {revenueTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>
            Revenue by team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="user_name" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="total_revenue" 
                  fill={COLORS[0]}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Volume */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Transaction Volume & Average Deal Size</CardTitle>
          <CardDescription>
            Number of transactions and average deal size over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period_label" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toString()}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="transaction_count" 
                  fill={COLORS[3]}
                  fillOpacity={0.6}
                  name="Transaction Count"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_revenue"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                  name="Total Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
          <CardDescription>
            Summary of overall revenue performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.overall_metrics.total_revenue)}
              </div>
              <div className="text-sm text-green-600 font-medium">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.overall_metrics.total_transactions}
              </div>
              <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.overall_metrics.unique_users}
              </div>
              <div className="text-sm text-purple-600 font-medium">Active Users</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(analytics.overall_metrics.average_deal_size)}
              </div>
              <div className="text-sm text-orange-600 font-medium">Avg Deal Size</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}