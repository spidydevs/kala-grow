import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Bell,
  Check,
  CheckCheck,
  MoreHorizontal,
  Settings,
  Trash2,
  Loader2,
  RefreshCw,
  Inbox
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationService, { Notification } from '@/services/notificationService'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface NotificationCenterProps {
  onClose?: () => void
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeleting
  } = useNotifications()
  
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const navigate = useNavigate()

  const unreadNotifications = notifications.filter(n => !n.read_at)
  const readNotifications = notifications.filter(n => n.read_at)

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      markAsRead([notification.id])
    }

    // Navigate to relevant page based on notification type
    if (notification.entity_type === 'task' && notification.entity_id) {
      navigate(`/tasks?task_id=${notification.entity_id}`)
      onClose?.()
    }
  }

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsRead()
    }
  }

  const handleDeleteSelected = () => {
    if (selectedNotifications.length > 0) {
      deleteNotifications(selectedNotifications)
      setSelectedNotifications([])
      setShowDeleteDialog(false)
    }
  }

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const selectAllNotifications = () => {
    setSelectedNotifications(notifications.map(n => n.id))
  }

  const clearSelection = () => {
    setSelectedNotifications([])
  }

  if (isLoading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Bell className="h-4 w-4" />
          <CardTitle className="text-base">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshNotifications}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMarkAllAsRead} disabled={unreadCount === 0 || isMarkingAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={selectAllNotifications}>
                <Check className="h-4 w-4 mr-2" />
                Select all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearSelection} disabled={selectedNotifications.length === 0}>
                Clear selection
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedNotifications.length === 0}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete selected
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={() => {
                navigate('/settings/notifications')
                onClose?.()
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">You'll see new notifications here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Unread notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    New ({unreadNotifications.length})
                  </div>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isSelected={selectedNotifications.includes(notification.id)}
                      onToggleSelect={toggleNotificationSelection}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
              
              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && <Separator />}
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    Earlier ({readNotifications.length})
                  </div>
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isSelected={selectedNotifications.includes(notification.id)}
                      onToggleSelect={toggleNotificationSelection}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                navigate('/notifications')
                onClose?.()
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

interface NotificationItemProps {
  notification: Notification
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onClick: () => void
}

function NotificationItem({ notification, isSelected, onToggleSelect, onClick }: NotificationItemProps) {
  const typeInfo = NotificationService.getNotificationTypeInfo(notification.type)
  const timeAgo = NotificationService.formatNotificationTime(notification.created_at)
  const isUnread = !notification.read_at

  return (
    <div
      className={cn(
        'flex items-start space-x-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
        isUnread && 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500',
        isSelected && 'bg-muted'
      )}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.stopPropagation()
          onToggleSelect(notification.id)
        } else {
          onClick()
        }
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(notification.id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-1"
      />
      
      <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', typeInfo.color)} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              isUnread ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {notification.title}
            </p>
            <p className={cn(
              'text-xs mt-1 line-clamp-2',
              isUnread ? 'text-foreground/80' : 'text-muted-foreground'
            )}>
              {notification.message}
            </p>
          </div>
          
          {isUnread && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="text-xs">
            {typeInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

export default NotificationCenter