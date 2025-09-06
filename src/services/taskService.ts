import { supabase } from '@/lib/supabase'
import { ApiClient, enhancedQueryOptions } from '@/lib/api'
import type { Task } from '@/lib/supabase'

// Task Management API Service
export class TaskService {
  // Create a new task
  static async createTask(taskData: {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status?: string
    category_id?: string
    project_id?: string
    due_date?: string
    estimated_hours?: number
    tags?: string[]
    assigned_to?: string[] | string // Support for task assignments
  }) {
    return ApiClient.invokeEdgeFunction('create-task', {
      body: taskData
    })
  }

  // Update existing task with reassignment support
  static async updateTask(taskId: string, updates: Partial<Task>) {
    return ApiClient.invokeEdgeFunction('update-task', {
      body: {
        task_id: taskId,
        updates: updates
      },
      method: 'POST'
    })
  }

  // Get tasks with filtering and pagination
  static async getTasks(params?: {
    status?: string
    priority?: string
    category_id?: string
    project_id?: string
    limit?: number
    offset?: number
    sort?: string
  }) {
    return ApiClient.invokeEdgeFunction('get-tasks', {
      body: params || {},
      method: 'POST',
      cache: true
    })
  }

  // Complete a task
  static async completeTask(taskId: string) {
    return ApiClient.invokeEdgeFunction('complete-task', {
      body: { task_id: taskId }
    })
  }

  // Delete a task
  static async deleteTask(taskId: string) {
    return ApiClient.invokeEdgeFunction('delete-task', {
      body: { task_id: taskId }
    })
  }
}

// Custom hook for task management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useTasks(params?: Parameters<typeof TaskService.getTasks>[0]) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => TaskService.getTasks(params),
    ...enhancedQueryOptions
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: TaskService.createTask,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      toast.success(`Task created! +${(data as any)?.points_earned || 0} points earned`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => 
      TaskService.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: TaskService.completeTask,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      
      const points = (data as any)?.points_earned || 0
      const achievements = (data as any)?.achievements || []
      
      toast.success(`Task completed! +${points} points earned`)
      
      if (achievements && achievements.length > 0) {
        achievements.forEach((achievement: string) => {
          toast.success(`Achievement unlocked: ${achievement}! 🏆`)
        })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: TaskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      toast.success('Task deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}