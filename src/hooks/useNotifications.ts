import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import NotificationService, { Notification, NotificationResponse } from '@/services/notificationService'
import { toast } from 'sonner'

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(true)

  // Query for notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => NotificationService.getNotifications(),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
    staleTime: 10000 // Consider data stale after 10 seconds
  })

  // Update unread count when data changes
  useEffect(() => {
    if (notificationsData?.unread_count !== undefined) {
      setUnreadCount(notificationsData.unread_count)
    }
  }, [notificationsData?.unread_count])

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return

    console.log('Setting up real-time notification subscription for user:', user.id)

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload)
          
          const newNotification = payload.new as Notification
          
          // Show toast notification
          toast(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                // Handle notification click - could navigate to relevant page
                console.log('Notification clicked:', newNotification)
              }
            }
          })
          
          // Update unread count
          setUnreadCount(prev => prev + 1)
          
          // Invalidate and refetch notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification updated:', payload)
          
          // If notification was marked as read, update unread count
          const oldNotification = payload.old as Notification
          const newNotification = payload.new as Notification
          
          if (!oldNotification.read_at && newNotification.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
          
          // Invalidate and refetch notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up notification subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  // Mark notifications as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) => NotificationService.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      console.error('Failed to mark notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      setUnreadCount(0)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  })

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: (notificationIds: string[]) => NotificationService.deleteNotifications(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete notifications:', error)
      toast.error('Failed to delete notifications')
    }
  })

  // Helper functions
  const markAsRead = useCallback((notificationIds: string[]) => {
    markAsReadMutation.mutate(notificationIds)
  }, [markAsReadMutation])

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const deleteNotifications = useCallback((notificationIds: string[]) => {
    deleteNotificationsMutation.mutate(notificationIds)
  }, [deleteNotificationsMutation])

  const refreshNotifications = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    // Data
    notifications: notificationsData?.notifications || [],
    unreadCount,
    totalCount: notificationsData?.total_count || 0,
    
    // States
    isLoading,
    error,
    isConnected,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
    
    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationsMutation.isPending
  }
}

export default useNotifications