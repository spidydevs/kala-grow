import { useState, useEffect } from 'react';
import { proxyDB } from '../lib/database-proxy';

export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalPoints: number;
  teamActivity: TeamMember[];
  tasksByStatus: StatusCount[];
  dailyProgress: DailyProgress[];
}

export interface TeamMember {
  id: string;
  name: string;
  tasksCompleted: number;
  totalPoints: number;
  avatar_url?: string;
  lastActivity?: string;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface DailyProgress {
  date: string;
  completed: number;
  created: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const useProductivityAnalytics = (dateRange: DateRange) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();

      // Try custom query first for better performance
      try {
        const { data: analyticsData, error: analyticsError } = await proxyDB.getProductivityAnalytics();
        
        if (analyticsError) {
          throw new Error(`Custom analytics query failed: ${analyticsError.message}`);
        }

        // Process the custom analytics data for our date range
        if (analyticsData) {
          const processedData = processAnalyticsData(analyticsData, dateRange);
          setData(processedData);
          return;
        }
      } catch (customError) {
        console.warn('Custom analytics failed, falling back to individual queries:', customError);
      }

      // Fallback: Individual queries through proxy
      const { data: tasksData, error: tasksError } = await proxyDB.select('tasks', {
        select: 'id, user_id, status, points, completed_at, created_at'
        // Note: Date range filtering handled by Edge Function
      });

      if (tasksError) throw new Error(`Tasks query failed: ${tasksError.message}`);

      // Fetch profiles data separately
      const { data: profilesData, error: profilesError } = await proxyDB.select('profiles', {
        select: 'id, full_name, avatar_url, role'
      });

      if (profilesError) throw new Error(`Profiles query failed: ${profilesError.message}`);

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Calculate basic metrics
      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(task => 
        task.status === 'completed' && 
        task.completed_at &&
        new Date(task.completed_at) >= dateRange.startDate &&
        new Date(task.completed_at) <= dateRange.endDate
      ).length || 0;
      
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const totalPoints = tasksData?.reduce((sum, task) => sum + (task.points || 0), 0) || 0;

      // Group tasks by status
      const statusCounts = tasksData?.reduce((acc: Record<string, number>, task: any) => {
        const status = task.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const tasksByStatus: StatusCount[] = Object.entries(statusCounts).map(
        ([status, count]: [string, number]) => ({ status, count })
      );

      // Calculate team member activity
      const userStats: Record<string, TeamMember> = tasksData?.reduce((acc: Record<string, TeamMember>, task: any) => {
        const userId = task.user_id;
        if (!userId) return acc;

        if (!acc[userId]) {
          const profile = profilesMap.get(userId);
          acc[userId] = {
            id: userId,
            name: profile?.full_name || 'Unknown User',
            avatar_url: profile?.avatar_url,
            tasksCompleted: 0,
            totalPoints: 0,
          };
        }

        if (task.status === 'completed' && 
            task.completed_at &&
            new Date(task.completed_at) >= dateRange.startDate &&
            new Date(task.completed_at) <= dateRange.endDate) {
          acc[userId].tasksCompleted += 1;
        }
        
        acc[userId].totalPoints += task.points || 0;
        return acc;
      }, {}) || {};

      // Try to get activity data
      let activityData: any[] = [];
      try {
        const { data: activities } = await proxyDB.select('activity_feed', {
          select: 'user_id, created_at',
          orderBy: 'created_at.desc'
          // Note: Date range filtering handled by Edge Function
        });
        activityData = activities || [];
      } catch (activityError) {
        console.warn('Activity feed query failed:', activityError);
        // Continue without activity data
      }

      // Add last activity to user stats
      activityData?.forEach(activity => {
        if (userStats[activity.user_id]) {
          if (!userStats[activity.user_id].lastActivity ||
              new Date(activity.created_at) > new Date(userStats[activity.user_id].lastActivity!)) {
            userStats[activity.user_id].lastActivity = activity.created_at;
          }
        }
      });

      const teamActivity: TeamMember[] = Object.values(userStats)
        .sort((a: TeamMember, b: TeamMember) => b.tasksCompleted - a.tasksCompleted);

      // Calculate daily progress
      const dailyProgressMap = new Map<string, DailyProgress>();
      
      tasksData?.forEach(task => {
        const createdDate = new Date(task.created_at).toISOString().split('T')[0];
        if (!dailyProgressMap.has(createdDate)) {
          dailyProgressMap.set(createdDate, {
            date: createdDate,
            completed: 0,
            created: 0,
          });
        }
        dailyProgressMap.get(createdDate)!.created += 1;

        if (task.status === 'completed' && task.completed_at) {
          const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
          if (!dailyProgressMap.has(completedDate)) {
            dailyProgressMap.set(completedDate, {
              date: completedDate,
              completed: 0,
              created: 0,
            });
          }
          dailyProgressMap.get(completedDate)!.completed += 1;
        }
      });

      const dailyProgress = Array.from(dailyProgressMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData({
        totalTasks,
        completedTasks,
        completionRate,
        totalPoints,
        teamActivity,
        tasksByStatus,
        dailyProgress,
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange.startDate, dateRange.endDate]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};

// Process custom analytics data for specific date range
function processAnalyticsData(analyticsData: any, dateRange: DateRange): AnalyticsData {
  const { tasks, profiles, analytics } = analyticsData;
  
  // Filter tasks by date range
  const filteredTasks = tasks.filter((task: any) => {
    const createdAt = new Date(task.created_at);
    return createdAt >= dateRange.startDate && createdAt <= dateRange.endDate;
  });

  // Recalculate metrics for the specific date range
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((task: any) => 
    task.status === 'completed' &&
    task.completed_at &&
    new Date(task.completed_at) >= dateRange.startDate &&
    new Date(task.completed_at) <= dateRange.endDate
  ).length;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const totalPoints = filteredTasks.reduce((sum: number, task: any) => sum + (task.points || 0), 0);

  // Build team activity from filtered tasks
  const userStats: Record<string, TeamMember> = {};
  filteredTasks.forEach((task: any) => {
    if (!task.user_id) return;
    
    if (!userStats[task.user_id]) {
      userStats[task.user_id] = {
        id: task.user_id,
        name: task.profile?.full_name || 'Unknown User',
        avatar_url: task.profile?.avatar_url,
        tasksCompleted: 0,
        totalPoints: 0,
      };
    }
    
    if (task.status === 'completed' &&
        task.completed_at &&
        new Date(task.completed_at) >= dateRange.startDate &&
        new Date(task.completed_at) <= dateRange.endDate) {
      userStats[task.user_id].tasksCompleted += 1;
    }
    
    userStats[task.user_id].totalPoints += task.points || 0;
  });

  const teamActivity = Object.values(userStats)
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  // Calculate status counts for filtered tasks
  const statusCounts = filteredTasks.reduce((acc: Record<string, number>, task: any) => {
    const status = task.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const tasksByStatus: StatusCount[] = Object.entries(statusCounts).map(
    ([status, count]: [string, number]) => ({ status, count })
  );

  // Calculate daily progress for filtered tasks
  const dailyProgressMap = new Map<string, DailyProgress>();
  filteredTasks.forEach((task: any) => {
    const createdDate = new Date(task.created_at).toISOString().split('T')[0];
    if (!dailyProgressMap.has(createdDate)) {
      dailyProgressMap.set(createdDate, {
        date: createdDate,
        completed: 0,
        created: 0,
      });
    }
    dailyProgressMap.get(createdDate)!.created += 1;

    if (task.status === 'completed' && task.completed_at) {
      const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
      if (!dailyProgressMap.has(completedDate)) {
        dailyProgressMap.set(completedDate, {
          date: completedDate,
          completed: 0,
          created: 0,
        });
      }
      dailyProgressMap.get(completedDate)!.completed += 1;
    }
  });

  const dailyProgress = Array.from(dailyProgressMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    totalTasks,
    completedTasks,
    completionRate,
    totalPoints,
    teamActivity,
    tasksByStatus,
    dailyProgress,
  };
}