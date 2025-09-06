import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Format relative date
export function formatRelativeDate(dateString: string): string {
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
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return formatDate(dateString)
  }
}

// Format duration in seconds to human readable format
export function formatDurationSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

// Format duration in hours
export function formatDuration(hoursOrSeconds: number, isSeconds: boolean = false): string {
  if (isSeconds) {
    return formatDurationSeconds(hoursOrSeconds)
  }
  
  const hours = hoursOrSeconds
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  } else if (hours < 8) {
    return `${hours}h`
  } else {
    const days = Math.floor(hours / 8)
    const remainingHours = hours % 8
    if (remainingHours === 0) {
      return `${days}d`
    } else {
      return `${days}d ${remainingHours}h`
    }
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'done':
    case 'closed won':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'in_progress':
    case 'in progress':
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'planning':
    case 'pending':
    case 'todo':
    case 'to do':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'review':
    case 'in_review':
    case 'in review':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'cancelled':
    case 'closed lost':
    case 'archived':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'on_hold':
    case 'on hold':
    case 'paused':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

// Get priority color
export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

// Generate avatar color based on string
export function getAvatarColor(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-green-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-pink-500',
    'bg-lime-500',
    'bg-orange-500'
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}