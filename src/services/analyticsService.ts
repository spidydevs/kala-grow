import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

// Business Analytics Service - connects to reporting-engine Edge Function
export class BusinessAnalyticsService {
  // Get comprehensive dashboard metrics
  static async getDashboardMetrics(params?: {
    period?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        reportType: 'productivity',
        dateRange: params?.period || 'month',
        filters: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch dashboard metrics')
    }

    return data
  }

  // Get team analytics
  static async getTeamAnalytics(params?: {
    period?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        reportType: 'team',
        dateRange: params?.period || 'month',
        filters: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch team analytics')
    }

    return data
  }

  // Get time analytics
  static async getTimeAnalytics(params?: {
    period?: string
    userId?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        reportType: 'time',
        dateRange: params?.period || 'month',
        filters: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch time analytics')
    }

    return data
  }

  // Generate productivity report
  static async generateProductivityReport(params?: {
    period?: number
    includeTeam?: boolean
    metrics?: string[]
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('get-productivity-analytics', {
      body: {
        action: 'get_productivity_analytics',
        data: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate productivity report')
    }

    return data
  }

  // Calculate productivity score
  static async calculateProductivityScore(params?: {
    period?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        reportType: 'productivity',
        dateRange: params?.period || 'month',
        filters: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to calculate productivity score')
    }

    return data
  }

  // Get focus time analysis
  static async getFocusTimeAnalysis(params?: {
    period?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        reportType: 'focus',
        dateRange: params?.period || 'month',
        filters: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch focus time analysis')
    }

    return data
  }

  // Get productivity trends
  static async getProductivityTrends(params?: {
    period?: string
    organizationId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('get-productivity-analytics', {
      body: {
        action: 'get_productivity_analytics',
        data: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch productivity trends')
    }

    return data
  }
}

// React Query hooks for business analytics
export function useDashboardMetrics(params?: Parameters<typeof BusinessAnalyticsService.getDashboardMetrics>[0]) {
  return useQuery({
    queryKey: ['dashboard-metrics', params],
    queryFn: () => BusinessAnalyticsService.getDashboardMetrics(params),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useTeamAnalytics(params?: Parameters<typeof BusinessAnalyticsService.getTeamAnalytics>[0]) {
  return useQuery({
    queryKey: ['team-analytics', params],
    queryFn: () => BusinessAnalyticsService.getTeamAnalytics(params),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useBusinessTimeAnalytics(params?: Parameters<typeof BusinessAnalyticsService.getTimeAnalytics>[0]) {
  return useQuery({
    queryKey: ['business-time-analytics', params],
    queryFn: () => BusinessAnalyticsService.getTimeAnalytics(params),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useProductivityReport(params?: Parameters<typeof BusinessAnalyticsService.generateProductivityReport>[0]) {
  return useQuery({
    queryKey: ['productivity-report', params],
    queryFn: () => BusinessAnalyticsService.generateProductivityReport(params),
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useProductivityScore(params?: Parameters<typeof BusinessAnalyticsService.calculateProductivityScore>[0]) {
  return useQuery({
    queryKey: ['productivity-score', params],
    queryFn: () => BusinessAnalyticsService.calculateProductivityScore(params),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useFocusTimeAnalysis(params?: Parameters<typeof BusinessAnalyticsService.getFocusTimeAnalysis>[0]) {
  return useQuery({
    queryKey: ['focus-time-analysis', params],
    queryFn: () => BusinessAnalyticsService.getFocusTimeAnalysis(params),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useProductivityTrends(params?: Parameters<typeof BusinessAnalyticsService.getProductivityTrends>[0]) {
  return useQuery({
    queryKey: ['productivity-trends', params],
    queryFn: () => BusinessAnalyticsService.getProductivityTrends(params),
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

// Enhanced productivity analytics hook
export function useProductivityAnalyticsLegacy(params?: {
  start_date?: string
  end_date?: string
  include_charts?: boolean
  period?: string
}) {
  return useQuery({
    queryKey: ['productivity-analytics-legacy', params],
    queryFn: () => {
      // Transform params to match BusinessAnalyticsService expectations
      const transformedParams = {
        period: params?.period ? parseInt(params.period) || 30 : 30,
        includeTeam: true,
        metrics: ['tasks', 'productivity', 'time'],
        organizationId: undefined
      };
      return BusinessAnalyticsService.generateProductivityReport(transformedParams);
    },
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

// Comprehensive Reports Service
export class ReportsService {
  // Generate comprehensive report
  static async generateReport(params: {
    report_type: 'productivity' | 'financial' | 'tasks' | 'time' | 'comprehensive'
    start_date: string
    end_date: string
    include_charts?: boolean
    format?: 'json' | 'csv' | 'pdf'
  }) {
    const { data, error } = await supabase.functions.invoke('comprehensive-analytics', {
      body: {
        action: 'generate_comprehensive_report',
        data: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate report')
    }

    return data
  }

  // Export report data
  static async exportReport(params: {
    report_data: any
    format: 'csv' | 'pdf'
    report_type: string
  }) {
    const { data, error } = await supabase.functions.invoke('data-export', {
      body: {
        action: 'export_report',
        data: params
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to export report')
    }

    return data
  }

  // Get financial reports
  static async getFinancialReport(params: {
    report_type: 'financial_summary' | 'invoice_report' | 'expense_report'
    start_date: string
    end_date: string
    include_charts?: boolean
  }) {
    const { data, error } = await supabase.functions.invoke('finance/generate-financial-report', {
      body: params
    })

    if (error) {
      throw new Error(error.message || 'Failed to generate financial report')
    }

    return data
  }
}

// React Query hooks for reports
export function useComprehensiveReport(params?: Parameters<typeof ReportsService.generateReport>[0]) {
  return useQuery({
    queryKey: ['comprehensive-report', params],
    queryFn: () => ReportsService.generateReport(params!),
    enabled: !!params,
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useFinancialReport(params?: Parameters<typeof ReportsService.getFinancialReport>[0]) {
  return useQuery({
    queryKey: ['financial-report', params],
    queryFn: () => ReportsService.getFinancialReport(params!),
    enabled: !!params,
    staleTime: 300000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}
