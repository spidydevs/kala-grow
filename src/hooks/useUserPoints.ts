import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

export interface UserPoints {
  total_points: number
  points_earned: number
  points_spent: number
  last_point_activity: string
}

export interface PointTransaction {
  id: string
  transaction_type: string
  points_amount: number
  description: string
  created_at: string
  task_id?: string
}

export function useUserPoints() {
  const [points, setPoints] = useState<UserPoints | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    async function fetchUserPoints() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch user points
        const { data: pointsData, error: pointsError } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (pointsError) {
          throw pointsError
        }

        if (pointsData) {
          setPoints(pointsData)
        } else {
          // Initialize user points if not exists
          const { data: newPoints, error: createError } = await supabase
            .from('user_points')
            .insert({
              user_id: user.id,
              total_points: 0,
              points_earned: 0,
              points_spent: 0
            })
            .select()
            .single()

          if (createError) {
            throw createError
          }

          setPoints(newPoints)
        }

        // Fetch recent transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('point_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (transactionsError) {
          console.warn('Failed to fetch transactions:', transactionsError)
        } else {
          setTransactions(transactionsData || [])
        }
      } catch (err: any) {
        console.error('User points fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUserPoints()
  }, [user])

  const awardPoints = async (taskId: string, points: number, description?: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase.functions.invoke('points-manager', {
        body: {
          action: 'AWARD_TASK_COMPLETION',
          user_id: user.id,
          task_id: taskId,
          points: points,
          description: description
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Refresh points data
      if (data?.data?.user_points) {
        setPoints(data.data.user_points)
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-points'] })
      queryClient.invalidateQueries({ queryKey: ['point-transactions'] })

      return data.data
    } catch (err: any) {
      console.error('Points award error:', err)
      throw err
    }
  }

  const deductPoints = async (taskId: string, points: number, description?: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase.functions.invoke('points-manager', {
        body: {
          action: 'DEDUCT_TASK_INCOMPLETION',
          user_id: user.id,
          task_id: taskId,
          points: points,
          description: description
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Refresh points data
      if (data?.data?.user_points) {
        setPoints(data.data.user_points)
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-points'] })
      queryClient.invalidateQueries({ queryKey: ['point-transactions'] })

      return data.data
    } catch (err: any) {
      console.error('Points deduction error:', err)
      throw err
    }
  }

  return {
    points,
    transactions,
    loading,
    error,
    awardPoints,
    deductPoints
  }
}