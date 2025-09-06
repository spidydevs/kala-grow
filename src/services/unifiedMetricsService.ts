import { supabase } from '@/lib/supabase'
import { DatabaseProxy } from '@/lib/database-proxy'
import { UnifiedLevelService } from './unifiedLevelService'

// Unified Metrics Service - Single Source of Truth for All Statistics
export class UnifiedMetricsService {
  
  /**
   * Get comprehensive user metrics from a single, consistent source
   * This replaces all scattered metric calculations across the app
   */
  static async getUserMetrics(userId?: string, dateRange?: { startDate: Date; endDate: Date }) {
    try {
      // Get current user if not specified
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        userId = user.id
      }

      // Primary fallback to direct database access for reliability
      // This ensures the app works even when Edge Functions aren't deployed
      console.log('Using direct database access for unified metrics')
      return this.getFallbackMetrics(userId, dateRange)

      // Edge Function approach (commented out until deployed)
      /*
      const { data, error } = await supabase.functions.invoke('unified-metrics-engine', {
        body: {
          userId,
          dateRange: dateRange ? {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString()
          } : null,
          includeAll: true
        }
      })

      if (error) {
        console.warn('Unified metrics failed, using fallback calculation:', error)
        return this.getFallbackMetrics(userId, dateRange)
      }

      return {
        // Task metrics - consistent across all pages
        totalTasks: data.tasks.total,
        completedTasks: data.tasks.completed,
        inProgressTasks: data.tasks.in_progress,
        todoTasks: data.tasks.todo,
        completionRate: data.tasks.completion_rate,
        
        // Points system - single source
        totalPoints: data.points.total,
        pointsThisWeek: data.points.this_week,
        pointsThisMonth: data.points.this_month,
        
        // Gamification - consistent level calculation
        currentLevel: data.gamification.level,
        currentRank: data.gamification.rank,
        progressToNextLevel: data.gamification.progress_to_next_level,
        pointsToNextLevel: data.gamification.points_to_next_level,
        
        // Time tracking
        totalFocusTime: data.time.total_minutes,
        focusTimeToday: data.time.today_minutes,
        focusTimeThisWeek: data.time.this_week_minutes,
        
        // Activity metrics
        currentStreak: data.activity.current_streak,
        longestStreak: data.activity.longest_streak,
        lastActiveDate: data.activity.last_active_date,
        
        // Team metrics
        teamActivity: data.team || [],
        
        // Revenue metrics (for Finance Hub consistency)
        totalRevenue: data.revenue?.total || 0,
        pendingRevenue: data.revenue?.pending || 0,
        
        // Raw data for components that need it
        rawData: data
      }
      */
    } catch (error) {
      console.error('Error fetching unified metrics:', error)
      return this.getFallbackMetrics(userId, dateRange)
    }
  }

  /**
   * Fallback method using direct database queries when edge function fails
   */
  private static async getFallbackMetrics(userId: string, dateRange?: { startDate: Date; endDate: Date }) {
    try {
      // Get tasks directly from database
      const { data: tasks } = await DatabaseProxy.select('tasks', {
        select: 'id, status, points, completed_at, created_at, user_id',
        filters: dateRange ? {
          created_at: `gte.${dateRange.startDate.toISOString()},lte.${dateRange.endDate.toISOString()}`
        } : {}
      })

      // Get user stats
      const { data: userStats } = await DatabaseProxy.select('user_stats', {
        select: '*',
        filters: { user_id: userId }
      })

      const userStat = userStats?.[0] || {}
      const userTasks = tasks?.filter(task => task.user_id === userId) || []

      // Calculate consistent metrics
      const totalTasks = userTasks.length
      const completedTasks = userTasks.filter(task => 
        task.status === 'completed' && 
        (!dateRange || (
          task.completed_at && 
          new Date(task.completed_at) >= dateRange.startDate &&
          new Date(task.completed_at) <= dateRange.endDate
        ))
      ).length

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      const totalPoints = userStat.total_points || 0

      // Use unified level service for consistent calculations
      const levelInfo = await UnifiedLevelService.getUserLevelInfo(totalPoints)

      return {
        totalTasks,
        completedTasks,
        inProgressTasks: userTasks.filter(task => task.status === 'in_progress').length,
        todoTasks: userTasks.filter(task => task.status === 'todo').length,
        completionRate,
        totalPoints,
        pointsThisWeek: 0, // Would need time-based calculation
        pointsThisMonth: 0,
        currentLevel: levelInfo.currentLevel,
        currentRank: levelInfo.currentRankName,
        progressToNextLevel: levelInfo.progressPercentage,
        pointsToNextLevel: levelInfo.progressToNextRank,
        totalFocusTime: 0, // Would need focus_sessions query
        focusTimeToday: 0,
        focusTimeThisWeek: 0,
        currentStreak: userStat.current_streak || 0,
        longestStreak: userStat.longest_streak || 0,
        lastActiveDate: new Date().toISOString(),
        teamActivity: [],
        totalRevenue: 0,
        pendingRevenue: 0,
        rawData: { fallback: true, userStat, tasks: userTasks, levelInfo }
      }
    } catch (error) {
      console.error('Fallback metrics calculation failed:', error)
      // Return safe defaults
      return {
        totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0,
        completionRate: 0, totalPoints: 0, pointsThisWeek: 0, pointsThisMonth: 0,
        currentLevel: 1, currentRank: 'recruit', progressToNextLevel: 0,
        pointsToNextLevel: 100, totalFocusTime: 0, focusTimeToday: 0,
        focusTimeThisWeek: 0, currentStreak: 0, longestStreak: 0,
        lastActiveDate: new Date().toISOString(), teamActivity: [],
        totalRevenue: 0, pendingRevenue: 0, rawData: { error: true }
      }
    }
  }

  /**
   * Calculate rank from points using the database ranking system
   */
  private static calculateRankFromPoints(points: number): string {
    if (points >= 5000) return 'champion'
    if (points >= 2000) return 'master'
    if (points >= 1000) return 'elite'
    if (points >= 500) return 'veteran'
    if (points >= 250) return 'special_textbook'
    if (points >= 100) return 'scout'
    return 'recruit'
  }

  /**
   * Update user points and recalculate all dependent metrics
   * This ensures all systems stay synchronized when points change
   */
  static async updateUserPoints(userId: string, pointsToAdd: number, reason: string) {
    try {
      const { data, error } = await supabase.functions.invoke('unified-metrics-engine', {
        body: {
          action: 'update_points',
          userId,
          pointsToAdd,
          reason
        }
      })

      if (error) throw error

      // Return updated metrics
      return this.getUserMetrics(userId)
    } catch (error) {
      console.error('Error updating points:', error)
      throw error
    }
  }

  /**
   * Refresh all user metrics across the application
   */
  static async refreshUserMetrics(userId?: string) {
    return this.getUserMetrics(userId)
  }
}

// React hook for unified metrics
import { useQuery } from '@tanstack/react-query'

export function useUnifiedMetrics(
  dateRange?: { startDate: Date; endDate: Date },
  userId?: string
) {
  return useQuery({
    queryKey: ['unified-metrics', userId, dateRange],
    queryFn: () => UnifiedMetricsService.getUserMetrics(userId, dateRange),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('not authenticated')) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}