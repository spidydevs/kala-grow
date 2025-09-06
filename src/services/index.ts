// Central API service configuration
export * from './taskService'
export * from './financeService'
export * from './gamificationService'
export * from './analyticsService'
export * from './crmService'
// export * from './enhancedCRMService' // Commented out to avoid conflicts with updated crmService
export * from './medalService' // Restored for medal management
export * from './comprehensiveAnalyticsService'
export * from './revenueService'
export * from './crmFinanceService'
export * from './userManagementService'
export * from './unifiedUserService'
export * from './unifiedMetricsService'
export * from './unifiedLevelService'

// Export specific hooks for easier importing
export {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useDeleteTask
} from './taskService'

// Export analytics hooks
export {
  useProductivityAnalyticsLegacy,
  useComprehensiveReport,
  useFinancialReport,
  ReportsService
} from './analyticsService'

// Export comprehensive analytics hooks
export {
  useComprehensiveAnalytics,
  useRealTimeDashboard,
  useTaskAnalytics,
  useRevenueAnalytics,
  useUserPerformance,
  useNotificationAnalytics,
  useAllUsers
} from '../hooks/useComprehensiveAnalytics'

export {
  ComprehensiveAnalyticsService
} from './comprehensiveAnalyticsService'

// Re-export specific utility functions
export { 
  formatActivityMessage, 
  getActivityIcon, 
  calculateLevel,
  calculatePointsForLevel,
  getNextLevelPoints,
  getBadgeColor,
  usePointTransactions,
  formatTransactionMessage,
  getTransactionIcon
} from './gamificationService'

// Common API utilities
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: any): never {
  if (error instanceof ApiError) {
    throw error
  }
  
  if (error?.message) {
    throw new ApiError(error.message, error.status, error.code)
  }
  
  throw new ApiError('An unexpected error occurred')
}

// Common query options
export const defaultQueryOptions = {
  retry: (failureCount: number, error: any) => {
    if (error?.status === 401 || error?.status === 403) {
      return false // Don't retry auth errors
    }
    return failureCount < 3
  },
  staleTime: 30000, // 30 seconds
}

// Export categories and constants
export const EXPENSE_CATEGORIES = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'software', label: 'Software' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' }
] as const

export const TASK_PRIORITIES = [
  'low',
  'medium', 
  'high',
  'urgent'
] as const

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'review',
  'completed'
] as const

export const INVOICE_STATUSES = [
  'pending',
  'paid',
  'overdue',
  'cancelled'
] as const

export const REPORT_TYPES = [
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'invoice_report', label: 'Invoice Report' },
  { value: 'expense_report', label: 'Expense Report' },
  { value: 'tax_report', label: 'Tax Report' },
  { value: 'client_report', label: 'Client Report' }
] as const

// Utility functions
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(date)
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `INV-${year}-${random}`
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getPriorityColor(priority: string): string {
  const colors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100',
  }
  return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100'
}

export function getStatusColor(status: string): string {
  const colors = {
    todo: 'text-yellow-600 bg-yellow-100',
    in_progress: 'text-blue-600 bg-blue-100',
    review: 'text-orange-600 bg-orange-100',
    completed: 'text-green-600 bg-green-100',
    paid: 'text-green-600 bg-green-100',
    overdue: 'text-red-600 bg-red-100',
  }
  return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100'
}