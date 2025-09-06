import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface FocusSession {
  id: string
  user_id: string
  title: string
  description?: string
  planned_duration: number // minutes
  actual_duration?: number // minutes
  start_time: string
  end_time?: string
  productivity_score?: number
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  created_at: string
}

export class FocusTimerService {
  // Start a new focus session
  static async startSession(sessionData: {
    title: string
    description?: string
    duration: number // minutes
  }): Promise<FocusSession> {
    const { data, error } = await supabase.functions.invoke('tasks', {
      body: {
        action: 'start_session',
        session_data: sessionData
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to start focus session')
    }

    return data.data.session
  }

  // End a focus session
  static async endSession(sessionData: {
    session_id: string
    actual_duration: number
    productivity_score?: number
  }): Promise<FocusSession> {
    const { data, error } = await supabase.functions.invoke('tasks', {
      body: {
        action: 'end_session',
        session_data: sessionData
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to end focus session')
    }

    return data.data.session
  }

  // Get focus sessions for a period
  static async getSessions(period: '1d' | '7d' | '30d' = '7d'): Promise<{
    sessions: FocusSession[]
    stats: {
      total_sessions: number
      total_minutes: number
      average_productivity: number
      completed_sessions: number
    }
  }> {
    const { data, error } = await supabase.functions.invoke('tasks', {
      body: {
        action: 'get_sessions',
        session_data: { period }
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to get focus sessions')
    }

    return data.data
  }

  // Get active session
  static async getActiveSession(): Promise<FocusSession | null> {
    const { data, error } = await supabase.functions.invoke('tasks', {
      body: {
        action: 'get_active_session',
        session_data: {}
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to get active session')
    }

    return data.data.session
  }
}

// React Query hooks
export const useFocusSessions = (period: '1d' | '7d' | '30d' = '7d') => {
  return useQuery({
    queryKey: ['focus-sessions', period],
    queryFn: () => FocusTimerService.getSessions(period),
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    }
  })
}

export const useActiveSession = () => {
  return useQuery({
    queryKey: ['active-focus-session'],
    queryFn: () => FocusTimerService.getActiveSession(),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    }
  })
}

export const useStartFocusSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: FocusTimerService.startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-focus-session'] })
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
    }
  })
}

export const useEndFocusSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: FocusTimerService.endSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-focus-session'] })
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['productivityAnalytics'] })
    }
  })
}
