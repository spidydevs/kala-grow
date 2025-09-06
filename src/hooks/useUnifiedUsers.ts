import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UnifiedUserService, type UnifiedUser, type UsersListResponse } from '@/services/unifiedUserService'
import { toast } from 'sonner'

/**
 * React hooks for unified user management across the platform
 * These hooks ensure consistent user data access in all components
 */

/**
 * Hook to get all users with complete data
 * Use this in admin panels, user lists, etc.
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['unified-all-users'],
    queryFn: () => UnifiedUserService.getAllUsers(),
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to get active users only
 * Use this for task assignments, dropdowns, etc.
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['unified-active-users'],
    queryFn: () => UnifiedUserService.getActiveUsers(),
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to get users by role
 */
export function useUsersByRole(role: 'admin' | 'member') {
  return useQuery({
    queryKey: ['unified-users-by-role', role],
    queryFn: () => UnifiedUserService.getUsersByRole(role),
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to get a specific user by ID
 */
export function useUserById(userId: string) {
  return useQuery({
    queryKey: ['unified-user-by-id', userId],
    queryFn: () => UnifiedUserService.getUserById(userId),
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to check if current user is admin
 */
export function useIsCurrentUserAdmin() {
  return useQuery({
    queryKey: ['unified-is-current-user-admin'],
    queryFn: () => UnifiedUserService.isCurrentUserAdmin(),
    staleTime: 600000, // 10 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to get current user profile
 */
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ['unified-current-user-profile'],
    queryFn: () => UnifiedUserService.getCurrentUserProfile(),
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 3
    }
  })
}

/**
 * Hook to refresh user data across the app
 * Call this after user updates to ensure data consistency
 */
export function useRefreshUsers() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      // Invalidate all user-related queries
      await queryClient.invalidateQueries({ queryKey: ['unified-all-users'] })
      await queryClient.invalidateQueries({ queryKey: ['unified-active-users'] })
      await queryClient.invalidateQueries({ queryKey: ['unified-users-by-role'] })
      await queryClient.invalidateQueries({ queryKey: ['unified-user-by-id'] })
      await queryClient.invalidateQueries({ queryKey: ['unified-current-user-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['unified-is-current-user-admin'] })
      
      // Also invalidate legacy query keys to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['all-users'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      
      return true
    },
    onSuccess: () => {
      toast.success('User data refreshed successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh user data: ${error.message}`)
    }
  })
}

/**
 * Legacy hook for backward compatibility
 * Redirects to the new unified hook
 * @deprecated Use useAllUsers instead
 */
export function useLegacyAllUsers() {
  console.warn('useLegacyAllUsers is deprecated, use useAllUsers instead')
  const { data, ...rest } = useAllUsers()
  
  // Transform data to match old format if needed
  return {
    data: data?.users?.map(user => ({
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    })) || [],
    ...rest
  }
}

// Export types for convenience
export type { UnifiedUser, UsersListResponse }