import React from 'react';
import { type UsersResponse } from '../../services/userManagementService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Shield, UserCheck, Activity } from 'lucide-react';

interface UserStatsCardsProps {
  stats: UsersResponse;
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  const statsData = [
    {
      title: 'Total Users',
      value: stats.total_count,
      icon: Users,
      description: 'All users in the system',
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: stats.active_count,
      icon: UserCheck,
      description: 'Currently active users',
      color: 'bg-green-500'
    },
    {
      title: 'Administrators',
      value: stats.admin_count,
      icon: Shield,
      description: 'Users with admin privileges',
      color: 'bg-purple-500'
    },
    {
      title: 'Members',
      value: stats.member_count,
      icon: Activity,
      description: 'Regular team members',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`${stat.color} p-2 rounded-md`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}