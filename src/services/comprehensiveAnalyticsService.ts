import { ApiClient } from '@/lib/api'

export interface ComprehensiveAnalytics {
  tasks: {
    total: number
    completed: number
    in_progress: number
    todo: number
    completion_rate: number
    total_points: number
    average_completion_time: number
  }
  revenue: {
    total: number
    sales: number
    commission: number
    bonus: number
    project: number
    transaction_count: number
    average_deal_size: number
  }
  performance: {
    total_points: number
    productivity_score: number
    achievements_count: number
    activity_score: number
  }
  notifications: {
    total: number
    read: number
    unread: number
    engagement_rate: number
  }
  time: {
    active_days: number
    most_productive_day: string
    most_productive_hour: string
  }
}

export interface AnalyticsCharts {
  task_completion_trend: Array<{
    date: string
    created: number
    completed: number
    completion_rate: number
  }>
  revenue_trend: Array<{
    date: string
    revenue: number
    transactions: number
  }>
  productivity_overview: Array<{
    date: string
    tasks: number
    activities: number
    productivity_score: number
  }>
  performance_metrics: {
    completion_rate: number
    total_points: number
    achievements: number
    productivity_score: number
  }
}

export interface AnalyticsInsight {
  category: 'tasks' | 'revenue' | 'performance' | 'notifications'
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

export interface ComprehensiveAnalyticsResponse {
  analytics: ComprehensiveAnalytics
  charts: AnalyticsCharts
  insights: AnalyticsInsight[]
  period: {
    start_date: string
    end_date: string
    days: number
  }
  user_info: {
    id: string
    name: string
    role: string
    is_admin: boolean
  }
}

export class ComprehensiveAnalyticsService {
  /**
   * Get comprehensive analytics combining all data sources
   */
  static async getComprehensiveAnalytics(params: {
    start_date?: string
    end_date?: string
    user_id?: string
    include_charts?: boolean
  } = {}): Promise<ComprehensiveAnalyticsResponse> {
    const response = await ApiClient.invokeEdgeFunction<{ data: ComprehensiveAnalyticsResponse }>(
      'comprehensive-analytics',
      {
        body: {
          action: 'get_comprehensive_analytics',
          params: {
            start_date: params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: params.end_date || new Date().toISOString(),
            user_id: params.user_id,
            include_charts: params.include_charts ?? true
          }
        },
        method: 'POST'
      }
    )
    return response.data
  }

  /**
   * Get task-specific analytics
   */
  static async getTaskAnalytics(params: {
    start_date?: string
    end_date?: string
    user_id?: string
  } = {}) {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('comprehensive-analytics', {
      body: {
        action: 'get_task_analytics',
        params
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Get revenue-specific analytics
   */
  static async getRevenueAnalytics(params: {
    start_date?: string
    end_date?: string
    user_id?: string
  } = {}) {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('comprehensive-analytics', {
      body: {
        action: 'get_revenue_analytics',
        params
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Get user performance analytics
   */
  static async getUserPerformance(params: {
    start_date?: string
    end_date?: string
    user_id?: string
  } = {}) {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('comprehensive-analytics', {
      body: {
        action: 'get_user_performance',
        params
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Get notification analytics
   */
  static async getNotificationAnalytics(params: {
    start_date?: string
    end_date?: string
    user_id?: string
  } = {}) {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('comprehensive-analytics', {
      body: {
        action: 'get_notification_analytics',
        params
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Get real-time dashboard data (last 7 days)
   */
  static async getRealTimeDashboard(params: {
    user_id?: string
  } = {}) {
    const response = await ApiClient.invokeEdgeFunction<{ data: ComprehensiveAnalyticsResponse }>(
      'comprehensive-analytics',
      {
        body: {
          action: 'get_real_time_dashboard',
          params
        },
        method: 'POST'
      }
    )
    return response.data
  }
}

export default ComprehensiveAnalyticsService