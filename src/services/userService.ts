import { UnifiedUserService, type UnifiedUser } from './unifiedUserService'
import { useQuery } from '@tanstack/react-query'
import { enhancedQueryOptions } from '@/lib/api'

export interface User {
  id: string
  user_id: string // Add user_id for consistency with backend
  email: string
  full_name?: string
  role?: string
  status?: string
  job_title?: string
  company?: string
}

/**
 * User Service for task assignments and general user fetching
 * Now uses the unified user service as backend for consistency
 */
export const userService = {
  /**
   * Get all users for admin assignment purposes
   * Now uses UnifiedUserService for consistency across the platform
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await UnifiedUserService.getAllUsers()
      
      return response.users.map((user: UnifiedUser) => ({
        id: user.user_id, // Use user_id as the main id for task assignments
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'member',
        status: user.status || 'active',
        job_title: user.job_title,
        company: user.company
      }))
    } catch (error) {
      console.error('Error in getAllUsers:', error)
      return []
    }
  },

  /**
   * Get active users only
   */
  async getActiveUsers(): Promise<User[]> {
    try {
      const activeUsers = await UnifiedUserService.getActiveUsers()
      
      return activeUsers.map((user: UnifiedUser) => ({
        id: user.user_id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'member',
        status: user.status || 'active',
        job_title: user.job_title,
        company: user.company
      }))
    } catch (error) {
      console.error('Error in getActiveUsers:', error)
      return []
    }
  },

  /**
   * Get user display name
   */
  getUserDisplayName(user: User): string {
    return user.full_name || user.email.split('@')[0] || 'Unknown User'
  }
}

/**
 * React Query hook for fetching all users
 * Now uses unified service for consistency
 */
export function useUsers() {
  return useQuery({
    queryKey: ['legacy-users'], // Different key to avoid conflicts
    queryFn: () => userService.getAllUsers(),
    ...enhancedQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes  
  })
}

/**
 * React Query hook for fetching active users only
 * Useful for task assignments, dropdowns, etc.
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['legacy-active-users'],
    queryFn: () => userService.getActiveUsers(),
    ...enhancedQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export default userService