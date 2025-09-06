import { useQuery } from '@tanstack/react-query'
import ComprehensiveAnalyticsService, { ComprehensiveAnalyticsResponse } from '@/services/comprehensiveAnalyticsService'
// Import the unified user hooks for consistency
export { useAllUsers } from '@/hooks/useUnifiedUsers'

export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Hook for comprehensive analytics combining all data sources
 */
export function useComprehensiveAnalytics(dateRange: DateRange, userId?: string) {
  return useQuery({
    queryKey: ['comprehensive-analytics', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    queryFn: () => ComprehensiveAnalyticsService.getComprehensiveAnalytics({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString(),
      user_id: userId,
      include_charts: true
    }),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook for real-time dashboard data (auto-refreshes every 30 seconds)
 */
export function useRealTimeDashboard(userId?: string) {
  return useQuery({
    queryKey: ['real-time-dashboard', userId],
    queryFn: () => ComprehensiveAnalyticsService.getRealTimeDashboard({ user_id: userId }),
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook for task analytics
 */
export function useTaskAnalytics(dateRange: DateRange, userId?: string) {
  return useQuery({
    queryKey: ['task-analytics', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    queryFn: () => ComprehensiveAnalyticsService.getTaskAnalytics({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString(),
      user_id: userId
    }),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook for revenue analytics
 */
export function useRevenueAnalytics(dateRange: DateRange, userId?: string) {
  return useQuery({
    queryKey: ['revenue-analytics', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    queryFn: () => ComprehensiveAnalyticsService.getRevenueAnalytics({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString(),
      user_id: userId
    }),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook for user performance analytics
 */
export function useUserPerformance(dateRange: DateRange, userId?: string) {
  return useQuery({
    queryKey: ['user-performance', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    queryFn: () => ComprehensiveAnalyticsService.getUserPerformance({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString(),
      user_id: userId
    }),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook for notification analytics
 */
export function useNotificationAnalytics(dateRange: DateRange, userId?: string) {
  return useQuery({
    queryKey: ['notification-analytics', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    queryFn: () => ComprehensiveAnalyticsService.getNotificationAnalytics({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString(),
      user_id: userId
    }),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}