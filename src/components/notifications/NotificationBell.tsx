import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, BellRing } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationCenter } from './NotificationCenter'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

export function NotificationBell({ 
  className, 
  variant = 'ghost', 
  size = 'default' 
}: NotificationBellProps) {
  const { unreadCount, isConnected } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const hasUnread = unreadCount > 0
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString()

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'relative',
            !isConnected && 'opacity-60',
            className
          )}
          aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
            >
              {displayCount}
            </Badge>
          )}
          
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        <NotificationCenter onClose={() => setIsOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell