import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection = 'neutral'
}) => {
  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        {trend && (
          <p className={`text-xs ${getTrendColor()}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};