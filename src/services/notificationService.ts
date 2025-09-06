import { ApiClient } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  recipient_id: string
  sender_id?: string
  type: 'task_assigned' | 'task_reassigned' | 'task_completed' | 'task_updated' | 'system_alert' | 'department_assignment'
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  data: any
  read_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id?: string
  user_id: string
  task_assignments: boolean
  task_updates: boolean
  task_completions: boolean
  system_alerts: boolean
  department_notifications: boolean
  email_notifications: boolean
  push_notifications: boolean
  do_not_disturb: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  created_at?: string
  updated_at?: string
}

export interface NotificationResponse {
  notifications: Notification[]
  unread_count: number
  total_count: number
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: {
    recipient_id: string
    type: Notification['type']
    title: string
    message: string
    entity_type?: string
    entity_id?: string
    data?: any
  }) {
    return ApiClient.invokeEdgeFunction('notification-management', {
      body: {
        action: 'create_notification',
        ...data
      },
      method: 'POST'
    })
  }

  /**
   * Get notifications for the current user
   */
  static async getNotifications(options: {
    limit?: number
    offset?: number
    unread_only?: boolean
  } = {}): Promise<NotificationResponse> {
    const response = await ApiClient.invokeEdgeFunction<NotificationResponse>('notification-management', {
      body: {
        action: 'get_notifications',
        limit: options.limit || 50,
        offset: options.offset || 0,
        unread_only: options.unread_only || false
      },
      method: 'POST'
    })
    return response
  }

  /**
   * Mark specific notifications as read
   */
  static async markAsRead(notificationIds: string[]) {
    return ApiClient.invokeEdgeFunction('notification-management', {
      body: {
        action: 'mark_as_read',
        notification_ids: notificationIds
      },
      method: 'POST'
    })
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead() {
    return ApiClient.invokeEdgeFunction('notification-management', {
      body: {
        action: 'mark_all_as_read'
      },
      method: 'POST'
    })
  }

  /**
   * Delete notifications
   */
  static async deleteNotifications(notificationIds: string[]) {
    return ApiClient.invokeEdgeFunction('notification-management', {
      body: {
        action: 'delete_notifications',
        notification_ids: notificationIds
      },
      method: 'POST'
    })
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(): Promise<NotificationPreferences> {
    const response = await ApiClient.invokeEdgeFunction<NotificationPreferences>('notification-management', {
      body: {
        action: 'get_preferences'
      },
      method: 'POST'
    })
    return response
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(preferences: Partial<NotificationPreferences>) {
    return ApiClient.invokeEdgeFunction('notification-management', {
      body: {
        action: 'update_preferences',
        preferences
      },
      method: 'POST'
    })
  }

  /**
   * Send task assignment notification
   */
  static async sendTaskAssignmentNotification(data: {
    task_id: string
    task_title: string
    assigned_users: string[]
    sender_id: string
  }) {
    return ApiClient.invokeEdgeFunction('task-notifications', {
      body: {
        action: 'task_assigned',
        ...data
      },
      method: 'POST'
    })
  }

  /**
   * Send task reassignment notification
   */
  static async sendTaskReassignmentNotification(data: {
    task_id: string
    task_title: string
    assigned_users: string[]
    previous_assignees: string[]
    sender_id: string
  }) {
    return ApiClient.invokeEdgeFunction('task-notifications', {
      body: {
        action: 'task_reassigned',
        ...data
      },
      method: 'POST'
    })
  }

  /**
   * Send task completion notification
   */
  static async sendTaskCompletionNotification(data: {
    task_id: string
    task_title: string
    sender_id: string
  }) {
    return ApiClient.invokeEdgeFunction('task-notifications', {
      body: {
        action: 'task_completed',
        ...data
      },
      method: 'POST'
    })
  }

  /**
   * Send department assignment notification
   */
  static async sendDepartmentAssignmentNotification(data: {
    task_id: string
    task_title: string
    department_name: string
    department_users: string[]
    sender_id: string
  }) {
    return ApiClient.invokeEdgeFunction('task-notifications', {
      body: {
        action: 'department_assignment',
        ...data
      },
      method: 'POST'
    })
  }

  /**
   * Get notification type display info
   */
  static getNotificationTypeInfo(type: Notification['type']) {
    const typeMap = {
      task_assigned: {
        icon: '📋',
        color: 'bg-blue-500',
        label: 'Task Assignment'
      },
      task_reassigned: {
        icon: '🔄',
        color: 'bg-orange-500',
        label: 'Task Reassignment'
      },
      task_completed: {
        icon: '✅',
        color: 'bg-green-500',
        label: 'Task Completed'
      },
      task_updated: {
        icon: '📝',
        color: 'bg-purple-500',
        label: 'Task Updated'
      },
      system_alert: {
        icon: '🔔',
        color: 'bg-red-500',
        label: 'System Alert'
      },
      department_assignment: {
        icon: '🏢',
        color: 'bg-indigo-500',
        label: 'Department Assignment'
      }
    }
    return typeMap[type] || typeMap.system_alert
  }

  /**
   * Format relative time for notifications
   */
  static formatNotificationTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
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
      return date.toLocaleDateString()
    }
  }
}

export default NotificationService