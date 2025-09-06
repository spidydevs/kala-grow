import { supabase } from '@/lib/supabase'
import { Medal, UserMedal, RankTier, EnhancedUserStats } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Plus, Award, Trophy, Zap, Target, Timer, Brain, Rocket } from 'lucide-react'
import { medalService } from './medalService'

// Ranking System Service
export class RankingService {
  // Update user rank based on points earned
  static async updateUserRank(userId: string, pointsEarned: number): Promise<{
    user_stats: EnhancedUserStats
    current_rank: RankTier
    rank_changed: boolean
    points_earned: number
    total_points: number
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('points-manager', {
        body: {
          action: 'update_user_rank',
          userId,
          pointsEarned
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to update user rank')
      }

      // Show notification if rank changed
      if (data.data.rank_changed && data.data.current_rank) {
        toast.success(`🎉 Rank Up! You've achieved ${data.data.current_rank.name}!`)
      }

      return data.data
    } catch (error: any) {
      console.error('Error updating user rank:', error)
      throw error
    }
  }

  // Get leaderboard
  static async getLeaderboard(): Promise<EnhancedUserStats[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-leaderboard')

      if (error) {
        throw new Error(error.message || 'Failed to get leaderboard')
      }

      return data?.data?.leaderboard || []
    } catch (error: any) {
      console.error('Error getting leaderboard:', error)
      throw error // Don't return empty array, let the error propagate
    }
  }

  // Get user's current rank
  static async getUserRank(userId: string): Promise<EnhancedUserStats | null> {
    try {
      const { data, error } = await supabase.functions.invoke('points-manager', {
        body: {
          action: 'get_user_rank',
          userId
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to get user rank')
      }

      return data.data.user_rank
    } catch (error: any) {
      console.error('Error getting user rank:', error)
      return null
    }
  }

  // Calculate points earned for different actions
  static calculatePoints(action: string, data?: any): number {
    const pointsMap: { [key: string]: number } = {
      'task_completed': 10,
      'task_created': 5,
      'invoice_created': 15,
      'expense_logged': 3,
      'client_created': 8,
      'project_completed': 25,
      'daily_login': 2,
      'focus_session_completed': 12
    }

    let basePoints = pointsMap[action] || 0

    // Bonus points for high-priority tasks
    if (action === 'task_completed' && data?.priority === 'urgent') {
      basePoints += 5
    } else if (action === 'task_completed' && data?.priority === 'high') {
      basePoints += 3
    }

    // Bonus points for longer focus sessions
    if (action === 'focus_session_completed' && data?.duration) {
      const hours = data.duration / 3600 // Convert seconds to hours
      if (hours >= 2) {
        basePoints += 5
      } else if (hours >= 1) {
        basePoints += 3
      }
    }

    return basePoints
  }
}

// Auto-update user rank when points are earned
export const updateUserPointsAndRank = async (userId: string, action: string, data?: any) => {
  const pointsEarned = RankingService.calculatePoints(action, data)
  if (pointsEarned > 0) {
    try {
      await RankingService.updateUserRank(userId, pointsEarned)
    } catch (error) {
      console.error('Failed to update user rank:', error)
    }
  }
}

// Utility Functions for Gamification
export const calculateLevel = (totalPoints: number): number => {
  if (totalPoints < 100) return 0
  if (totalPoints < 250) return 1
  if (totalPoints < 500) return 2
  if (totalPoints < 1000) return 3
  if (totalPoints < 2000) return 4
  if (totalPoints < 4000) return 5
  if (totalPoints < 7000) return 6
  if (totalPoints < 12000) return 7
  if (totalPoints < 20000) return 8
  if (totalPoints < 35000) return 9
  return 10
}

export const calculatePointsForLevel = (level: number): number => {
  const pointsRequired = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 12000, 20000, 35000]
  return pointsRequired[level] || 35000
}

export const getNextLevelPoints = (currentPoints: number): number => {
  const currentLevel = calculateLevel(currentPoints)
  const nextLevel = Math.min(currentLevel + 1, 10)
  const nextLevelPoints = calculatePointsForLevel(nextLevel)
  return nextLevelPoints - currentPoints
}

export const getBadgeColor = (type: string): string => {
  const colors = {
    bronze: 'bg-orange-500',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-purple-500',
    diamond: 'bg-blue-500'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-500'
}

export const formatActivityMessage = (activity: any): string => {
  const messages = {
    task_completed: `Completed task: ${activity.metadata?.task_title || 'Unknown task'}`,
    task_created: `Created new task: ${activity.metadata?.task_title || activity.description?.replace('Created task: ', '') || 'Unknown task'}`,
    invoice_created: `Generated invoice for ${activity.metadata?.client_name || 'client'}`,
    expense_logged: `Logged expense: ${activity.metadata?.description || 'expense'}`,
    client_created: `Added new client: ${activity.metadata?.client_name || 'Unknown client'}`,
    project_completed: `Completed project: ${activity.metadata?.project_name || 'Unknown project'}`,
    daily_login: 'Logged in today',
    focus_session_completed: `Completed ${Math.round((activity.metadata?.duration || 0) / 60)} minute focus session`,
    medal_awarded: activity.description || `Awarded medal: ${activity.metadata?.medal_name || 'Unknown medal'}`
  }
  return messages[activity.activity_type as keyof typeof messages] || activity.description || `${activity.activity_type?.replace('_', ' ')}`
}

export const getActivityIcon = (activity_type: string) => {
  const icons = {
    task_completed: '✅',
    task_created: '📝',
    invoice_created: '💰',
    expense_logged: '💸',
    client_created: '👤',
    project_completed: '🎉',
    daily_login: '🔑',
    focus_session_completed: '⏱️',
    medal_awarded: '🏆'
  }
  return icons[activity_type as keyof typeof icons] || '⭐'
}

// Format relative time
export const formatRelativeTime = (timestamp: string): string => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return time.toLocaleDateString()
  }
}

// Format point transaction messages
export const formatTransactionMessage = (transaction: any): string => {
  const type = transaction.transaction_type
  const points = Math.abs(transaction.points_amount)
  const description = transaction.description || ''
  
  if (type === 'earned') {
    if (description.toLowerCase().includes('task')) {
      return `Earned ${points} points for completing a task`
    } else if (description.toLowerCase().includes('achievement')) {
      return `Earned ${points} points from achievement`
    } else if (description.toLowerCase().includes('bonus')) {
      return `Earned ${points} points bonus`
    } else {
      return `Earned ${points} points - ${description}`
    }
  } else if (type === 'spent') {
    return `Spent ${points} points - ${description}`
  } else {
    return `${type}: ${points} points - ${description}`
  }
}

export const getTransactionIcon = (transaction: any): string => {
  const type = transaction.transaction_type
  const description = transaction.description?.toLowerCase() || ''
  
  if (type === 'earned') {
    if (description.includes('task')) {
      return '✅'
    } else if (description.includes('achievement')) {
      return '🏆'
    } else if (description.includes('bonus')) {
      return '🎁'
    } else {
      return '💰'
    }
  } else if (type === 'spent') {
    return '💸'
  } else {
    return '📊'
  }
}

// React Query hooks for gamification data
export const useLeaderboard = (options: { timeframe?: string; limit?: number } = {}) => {
  return useQuery({
    queryKey: ['leaderboard', options.timeframe, options.limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-leaderboard', {
        body: {
          timeframe: options.timeframe || 'month',
          limit: options.limit || 20
        }
      })
      
      if (error) {
        throw error
      }
      
      return data
    },
    retry: (failureCount: number, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 30000 // 30 seconds
  })
}



export const useUserStats = () => {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('points-manager', {
        body: { action: 'get_user_stats' }
      })
      if (error) {
        console.error('User stats error:', error)
        throw error
      }
      return data.data
    },
    retry: (failureCount: number, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 60000 // 1 minute
  })
}

export const useAchievements = () => {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('points_required')
      if (error) throw error
      return data
    }
  })
}

export const useUserActivities = (options: { limit?: number } = {}) => {
  return useQuery({
    queryKey: ['userActivities', options.limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options.limit || 10)
      if (error) throw error
      return data
    }
  })
}

// Fetch ALL point transactions for Activities tab
export const usePointTransactions = (options: { limit?: number } = {}) => {
  return useQuery({
    queryKey: ['pointTransactions', options.limit],
    queryFn: async () => {
      let query = supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export const useProductivityAnalytics = (params?: any) => {
  return useQuery({
    queryKey: ['productivityAnalytics', params],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-productivity-analytics', {
        body: { action: 'get_productivity_analytics', data: params }
      })
      if (error) throw error
      return data
    },
    retry: (failureCount: number, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 60000 // 1 minute
  })
}

// Export default gamification service combining both
export const gamificationService = {
  medals: medalService,
  ranking: RankingService,
  updateUserPointsAndRank
}
