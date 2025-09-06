import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { DailyProgress } from '@/hooks/useProductivityAnalytics';
import { format, parseISO } from 'date-fns';

interface TaskCompletionChartProps {
  data: DailyProgress[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
}

export const TaskCompletionChart: React.FC<TaskCompletionChartProps> = ({
  data,
  loading = false,
  chartType = 'line'
}) => {
  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM dd'),
    completionRate: item.created > 0 ? ((item.completed / item.created) * 100).toFixed(1) : '0'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey === 'created' ? 'Created' : entry.dataKey === 'completed' ? 'Completed' : 'Completion Rate'}: ${entry.value}${entry.dataKey === 'completionRate' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Task Completion Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-4"></div>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded" style={{ width: `${60 + Math.random() * 40}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Task Completion Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No task completion data available for the selected date range.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Task Completion Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="formattedDate" 
                  className="text-muted-foreground text-xs"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-muted-foreground text-xs"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Tasks Created"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Tasks Completed"
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="formattedDate" 
                  className="text-muted-foreground text-xs"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-muted-foreground text-xs"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="created" 
                  fill="hsl(var(--primary))" 
                  name="Tasks Created"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="completed" 
                  fill="hsl(var(--chart-2))" 
                  name="Tasks Completed"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary Statistics */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {chartData.reduce((sum, item) => sum + item.created, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {chartData.reduce((sum, item) => sum + item.completed, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {chartData.length > 0 ? (
                  (
                    (chartData.reduce((sum, item) => sum + item.completed, 0) / 
                     chartData.reduce((sum, item) => sum + item.created, 0)) * 100
                  ).toFixed(1)
                ) : '0'}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Completion</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};